import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
directory=Path(sys.argv[1]);directory.mkdir(parents=True,exist_ok=True)
now=datetime.now(timezone.utc);authority_key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
authority_name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Synthetic Network Test CA')])
authority=x509.CertificateBuilder().subject_name(authority_name).issuer_name(authority_name).public_key(authority_key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(minutes=1)).not_valid_after(now+timedelta(days=1)).add_extension(x509.BasicConstraints(ca=True,path_length=0),critical=True).sign(authority_key,hashes.SHA256())
server_key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
server=x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'live.douyin.com')])).issuer_name(authority_name).public_key(server_key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(minutes=1)).not_valid_after(now+timedelta(days=1)).add_extension(x509.SubjectAlternativeName([x509.DNSName('live.douyin.com'),x509.DNSName('webcast5-ws-web-hl.douyin.com')]),critical=False).sign(authority_key,hashes.SHA256())
(directory/'ca.pem').write_bytes(authority.public_bytes(serialization.Encoding.PEM))
(directory/'server.pem').write_bytes(server.public_bytes(serialization.Encoding.PEM))
(directory/'server-key.pem').write_bytes(server_key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
