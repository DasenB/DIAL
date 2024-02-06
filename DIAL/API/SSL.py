from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
import datetime
import os
import tempfile

class SSL:
    def _save_certs(self, cert, key, directory="/tmp/dial-simulator-certs/"):
        directory = os.path.dirname(directory)
        if not os.path.exists(directory):
            os.makedirs(directory)
        key_pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        )
        key_path = f"{directory}/key.pem"
        with open(key_path, 'wb') as f:
            f.write(key_pem)
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)
        cert_path = f"{directory}/cert.pem"
        with open(cert_path, "wb") as f:
            f.write(cert_pem)
        return cert_path, key_path

    def _generate_certs(self):
        key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"DIAL Simulator"),
            x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
        ])
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.now(datetime.UTC)
        ).not_valid_after(
            datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([x509.DNSName(u"localhost")]),
            critical=False,
        ).sign(key, hashes.SHA256())
        return cert, key

    def ssl_context(self):
        tmp_dir = tempfile.gettempdir()
        path = f"{tmp_dir}/dial-simulator-certs/"
        key_path = f"{path}/key.pem"
        cert_path = f"{path}/cert.pem"

        if os.path.exists(key_path) and os.path.exists(cert_path):
            return cert_path, key_path

        if os.path.exists(key_path):
            os.remove(key_path)
        if os.path.exists(cert_path):
            os.remove(cert_path)
        cert, key = self._generate_certs()
        return self._save_certs(cert, key, path)

