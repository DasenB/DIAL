import copy
import math
import subprocess
import time
from datetime import datetime
from typing import Tuple
from pathlib import Path
import requests
import xlsxwriter
from urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
import psutil


def kill(proc_pid):
    process = psutil.Process(proc_pid)
    for proc in process.children(recursive=True):
        proc.kill()
    process.kill()
    time.sleep(5)


class Measurement:
    simulation_time: int
    data_point: int


class Experiment:
    endpoint: str
    sample_count: int
    measurements: list[Measurement]
    title: str

    def __int__(self, endpoint: str, sample_count: int):
        self.endpoint = endpoint
        self.sample_count = sample_count
        self.measurements = []

    def run(self):
        for i in range(self.sample_count):
            print(f"[{i + 1}/{self.sample_count}]")
            sample: Measurement = self.collect_measurement(self.endpoint)
            self.measurements.append(sample)

    def export(self, wb: xlsxwriter.Workbook):
        worksheet = wb.add_worksheet(self.title)
        worksheet.write(0, 0, "Endpoint")
        worksheet.write(0, 1, self.endpoint)
        worksheet.write(3, 0, "Simulation Time")
        worksheet.write(3, 1, "Measurement")
        row = 4
        for measurement in self.measurements:
            worksheet.write(row, 0, measurement.simulation_time)
            worksheet.write(row, 1, measurement.data_point)
            row += 1

    def collect_measurement(self, url: str) -> Measurement:
        raise NotImplementedError(
            "Your subclass of Experiment needs to implement the method 'collect_measurement(url: str) -> Measurement'.")


class LoadTimeOfTimeForward(Experiment):
    def __init__(self, title: str, steps_per_sample: int, sample_count: int):
        super().__int__(endpoint=f"https://localhost:10101/time-forward/{steps_per_sample}", sample_count=sample_count)
        self.title = title

    def collect_measurement(self, url: str) -> Measurement:
        response = requests.get(url, verify=False)
        measurement = Measurement()
        measurement.data_point = response.elapsed.total_seconds()
        measurement.simulation_time = response.json()["time"]
        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


class LoadTimeOfStepForward(Experiment):
    def __init__(self, title: str, steps_per_sample: int, sample_count: int):
        super().__int__(endpoint=f"https://localhost:10101/step-forward/{steps_per_sample}", sample_count=sample_count)
        self.title = title

    def collect_measurement(self, url: str) -> Measurement:
        response = requests.get(url, verify=False)
        measurement = Measurement()
        measurement.data_point = response.elapsed.total_seconds()
        measurement.simulation_time = response.json()["time"]
        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


class LoadTimeOfHTMLPage(Experiment):

    def __init__(self, title: str, steps_per_sample: int, sample_count):
        super().__int__(endpoint=f"https://localhost:10101/step-forward/{steps_per_sample}", sample_count=sample_count)
        self.title = title
        self.keep_driver = False
        self.driver: webdriver.Firefox

    def collect_measurement(self, url: str) -> Measurement:
        response = requests.get(url, verify=False)
        measurement = Measurement()
        measurement.simulation_time = response.json()["time"]

        options = webdriver.FirefoxOptions()
        options.add_argument("--headless")
        driver = webdriver.Firefox(options=options)
        self.driver = driver

        driver.get("https://localhost:10101/index.html")

        element = driver.find_element(By.XPATH, '/html/body/dial-simulator')
        action = webdriver.ActionChains(driver)
        action.move_to_element_with_offset(element, 5, 5)
        action.click()
        action.perform()

        try:
            element = WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.ID, "DIAL_BENCHMARK_LOAD"))
            )
            measurement.data_point = element.get_attribute("innerText")
        finally:
            if measurement.data_point is None:
                measurement.data_point = "failed to load page within 60s"

        if not self.keep_driver:
            driver.close()

        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


class FrameRate(LoadTimeOfHTMLPage):

    def __init__(self, title: str, steps_per_sample: int, sample_count: int):
        super().__init__(title=title, steps_per_sample=0, sample_count=sample_count)
        self.title = title
        self.keep_driver = True

    def collect_measurement(self, url: str) -> Measurement:
        benchmark_duration = 100
        measurement = super().collect_measurement(url)
        driver = self.driver
        driver.execute_script(f"document.body.children[1].benchmark_frames({benchmark_duration})")

        try:
            element = WebDriverWait(driver, benchmark_duration + 60).until(
                EC.presence_of_element_located((By.ID, "DIAL_BENCHMARK_FRAMES"))
            )
            measurement.data_point = element.get_attribute("innerText")
        finally:
            if measurement.data_point is None:
                measurement.data_point = f"benchmark did not finish within {benchmark_duration + 60}s"

        driver.close()

        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


samples = 15
steps = 100
repetition = 5
testprogramms = [
    "examples/benchmarks/actions.py",
    "examples/benchmarks/msg_burst.py",
    "examples/benchmarks/msg_continual.py",
    "examples/benchmarks/msg_transient.py",
    "examples/benchmarks/states.py",
    "examples/benchmarks/topology.py",
]
benchmarks = []
for testprogramm in testprogramms:
    filename = Path(testprogramm).stem
    for i in range(4):
        page_load = LoadTimeOfHTMLPage(title=f"{filename}_page-load_{i}", steps_per_sample=steps, sample_count=samples)
        step_forward = LoadTimeOfStepForward(title=f"{filename}_step-forward_{i}", steps_per_sample=steps, sample_count=samples)
        time_forward = LoadTimeOfTimeForward(title=f"{filename}_time-forward_{i}", steps_per_sample=steps, sample_count=samples)
        frame_rate = FrameRate(title=f"{filename}_frame-rate_{i}", steps_per_sample=steps, sample_count=samples)
        benchmarks += [(filename, page_load)]
        benchmarks += [(filename, step_forward)]
        benchmarks += [(filename, time_forward)]
        benchmarks += [(filename, frame_rate)]

workbook = xlsxwriter.Workbook(f'Benchmark_{datetime.now().strftime("%Y%m%d-%H%M%S")}.xlsx')
for script, experiment in benchmarks:
    simulator_process = subprocess.Popen(["python", f"examples/benchmarks/{script}.py"], shell=False)
    time.sleep(5)
    requests.get("https://localhost:10101/reset", verify=False)
    experiment.run()
    experiment.export(workbook)
    kill(simulator_process.pid)
workbook.close()
