{
    description = "DIAL is a framework for simulating and visualizing distributed algorithms in Python.";
    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
        flake-utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        dialVersion = "0.1.3b0";
        pkgs = import nixpkgs { system = "${system}"; config.allowUnfree = true; };
        pythonPackages = pkgs.python312Packages;
        python = pkgs.python312;
        dialPythonPackage = pythonPackages.buildPythonPackage rec {
            pname = "dial";
            version = dialVersion;
            format = "pyproject";

            src = ./.;

            propagatedBuildInputs = [
                pythonPackages.setuptools
                pythonPackages.flask
                pythonPackages.flask-cors
                pythonPackages.numpy
                pythonPackages.cryptography
            ];

            meta = with pkgs.lib; {
                description = "DIAL is a framework for simulating and visualizing distributed algorithms in Python.";
                homepage = "https://github.com/DasenB/DIAL";
                license = licenses.cc-by-nc-sa-40;
                maintainers = with maintainers; [];
            };
        };
        pythonWithPackages = (python.withPackages(ps: with ps; builtins.concatLists [
            [
                pythonPackages.flask
                pythonPackages.flask-cors
                pythonPackages.numpy
                pythonPackages.cryptography
            ]
            [ dialPythonPackage ]
        ]));
        dialScript = ''
        #!/bin/bash

        if [ -z "$1" ];
        then
            echo "You must supply a .py file as argument."
            echo "For examples see: https://github.com/DasenB/DIAL/tree/main/examples"
            exit 1
        fi

        ${pythonWithPackages}/bin/python $1
        '';
        dialPackage = pkgs.stdenv.mkDerivation {
            name = "dial";
            version = dialVersion;
            unpackPhase = "true";
            installPhase = ''
                mkdir -p $out/bin
                echo '${dialScript}' > $out/bin/dial
                chmod +x $out/bin/dial
            '';
        };
        dialApp = {
            type = "app";
            program = "${dialPackage}/bin/dial";
        };
        pythonApp = {
            type = "app";
            program = "${pythonWithPackages}/bin/python";
        };

      in
        {
            devShells.default = pkgs.mkShell {
                buildInputs = [ pythonWithPackages dialPackage ];
            };
            packages.dial = dialPackage;
            packages.default = dialPackage;
            packages.python = pythonWithPackages;
            apps.dial = dialApp;
            apps.default = pythonApp;
            apps.python = pythonApp;
        }
    );
}