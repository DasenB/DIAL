import time
from datetime import datetime
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


class Measurement:
    simulation_time: int
    data_point: int


class Experiment:
    endpoint: str
    sample_count: int
    measurements: list[Measurement]
    title: str

    def __int__(self, endpoint: str, sample_count: int = 100):
        self.endpoint = endpoint
        self.sample_count = sample_count
        self.measurements = []

    def run(self):
        for i in range(self.sample_count):
            print(f"[{i + 1}/{self.sample_count}]")
            sample: Measurement = self.collect_measurement(self.endpoint)
            self.measurements.append(sample)

    def export(self, workbook: xlsxwriter.Workbook):
        worksheet = workbook.add_worksheet(self.title)
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
    def __init__(self, steps_per_sample: int = 1000):
        super().__int__(endpoint=f"https://localhost:10101/time-forward/{steps_per_sample}")
        self.title = "time-forward"

    def collect_measurement(self, url: str) -> Measurement:
        response = requests.get(url, verify=False)
        measurement = Measurement()
        measurement.data_point = response.elapsed.total_seconds()
        measurement.simulation_time = response.json()["time"]
        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


class LoadTimeOfStepForward(Experiment):
    def __init__(self, steps_per_sample: int = 200):
        super().__int__(endpoint=f"https://localhost:10101/step-forward/{steps_per_sample}", sample_count=100)
        self.title = "step-forward"

    def collect_measurement(self, url: str) -> Measurement:
        response = requests.get(url, verify=False)
        measurement = Measurement()
        measurement.data_point = response.elapsed.total_seconds()
        measurement.simulation_time = response.json()["time"]
        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement


class LoadTimeOfHTMLPage(Experiment):

    def __init__(self, steps_per_sample: int = 50, sample_count: int = 20):
        super().__int__(endpoint=f"https://localhost:10101/step-forward/{steps_per_sample}", sample_count=sample_count)
        self.title = "page-load"
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

    def __init__(self):
        super().__init__(steps_per_sample=400, sample_count=10)
        self.title = "frame-rate"
        self.keep_driver = True

    def collect_measurement(self, url: str) -> Measurement:
        measurement = super().collect_measurement(url)
        driver = self.driver
        driver.execute_script("document.body.children[1].benchmark_frames()")

        try:
            element = WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.ID, "DIAL_BENCHMARK_FRAMES"))
            )
            measurement.data_point = element.get_attribute("innerText")
        finally:
            if measurement.data_point is None:
                measurement.data_point = "benchmark did not finish within 60s"

        driver.close()

        print(f"{measurement.simulation_time}: {self.title} took {measurement.data_point}")
        return measurement



benchmark: list[Experiment] = [
    LoadTimeOfTimeForward(),
    LoadTimeOfStepForward(),
    LoadTimeOfHTMLPage(),
    FrameRate()
]

requests.get("https://localhost:10101/reset", verify=False)
workbook = xlsxwriter.Workbook(f'Benchmark_{datetime.now().strftime("%Y%m%d-%H%M%S")}.xlsx')
for experiment in benchmark:
    experiment.run()
    experiment.export(workbook)
    requests.get("https://localhost:10101/reset", verify=False)
workbook.close()
