"""File-only test CA and loopback fixture; never opens a Windows certificate store.
Requires Python 3.12+ and cryptography 46+. Output is private and never overwritten.
"""
import datetime
import ipaddress
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import uuid
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID

folder = Path(sys.argv[1]).resolve()
folder.mkdir(parents=True, exist_ok=False)
if os.name == "nt":
    # Remove inherited grants on our new directory before any secret is written.
    script = "$p=$args[0];$s=[System.Security.Principal.WindowsIdentity]::GetCurrent().User;$a=Get-Acl -LiteralPath $p;$a.SetAccessRuleProtection($true,$false);$a.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($s,'FullControl','ContainerInherit,ObjectInherit','None','Allow'));$a.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new([System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),'FullControl','ContainerInherit,ObjectInherit','None','Allow'));Set-Acl -LiteralPath $p -AclObject $a"
    # Environment carries the exact literal path; no interpolation into shell code.
    script = script.replace("$p=$args[0]", "$p=$env:LW_CERT_OUTPUT")
    subprocess.run(["pwsh", "-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop';" + script], env={**os.environ, "LW_CERT_OUTPUT": str(folder)}, check=True, capture_output=True)
else:
    folder.chmod(0o700)
password = secrets.token_urlsafe(32).encode()
now = datetime.datetime.now(datetime.timezone.utc)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "LiveWorkbench stage test " + str(uuid.uuid4()))])
ca = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
      .serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=5))
      .not_valid_after(now+datetime.timedelta(days=7))
      .add_extension(x509.BasicConstraints(ca=True, path_length=0), True)
      .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), True)
      .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), False).sign(key, hashes.SHA256()))
leaf_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
leaf_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
leaf = (x509.CertificateBuilder().subject_name(leaf_name).issuer_name(name).public_key(leaf_key.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=5))
        .not_valid_after(now+datetime.timedelta(days=7))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), True)
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost"),x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]), False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), False).sign(key, hashes.SHA256()))
# Legacy PFX encryption is needed by .NET Framework; private directory + random password.
encryption = (serialization.PrivateFormat.PKCS12.encryption_builder().kdf_rounds(20000)
              .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC).hmac_hash(hashes.SHA1()).build(password))
outputs = {
    "ca.pfx": pkcs12.serialize_key_and_certificates(b"LiveWorkbench", key, ca, None, encryption),
    "ca.cer": ca.public_bytes(serialization.Encoding.DER),
    "ca.pem": ca.public_bytes(serialization.Encoding.PEM),
    "upstream.pem": leaf.public_bytes(serialization.Encoding.PEM),
    "upstream.cer": leaf.public_bytes(serialization.Encoding.DER),
    "upstream-key.pem": leaf_key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.BestAvailableEncryption(password)),
    "password.txt": password,
    "certificate-summary.json": json.dumps({"sha1":ca.fingerprint(hashes.SHA1()).hex().upper(),"sha256":ca.fingerprint(hashes.SHA256()).hex().upper(),"notAfter":ca.not_valid_after_utc.isoformat(),"trustedInWindows":False},indent=2).encode()
}
for filename, content in outputs.items():
    with (folder / filename).open("xb") as handle:
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())
    if os.name != "nt":
        (folder / filename).chmod(0o600)
print(json.dumps({"created":True,"trustInstalled":False,"privateKeyFormat":"encrypted-pfx"}))
