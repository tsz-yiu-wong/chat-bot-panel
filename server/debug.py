import socket
from urllib.parse import urlparse
import config

u = urlparse(config.POSTGRES_URI)
host, port = u.hostname, u.port or 5432

print("Resolving DNS…")
try:
    infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    print("DNS OK:", infos)   # 能输出 IP 列表就说明 DNS 没问题
except Exception as e:
    print("❌ DNS failed:", repr(e))

print("================================================")

import socket
from urllib.parse import urlparse

u = urlparse(config.POSTGRES_URI)
host, port = u.hostname, u.port or 5432

print("TCP handshake…")
try:
    s = socket.create_connection((host, port), timeout=5)
    print("TCP OK")
    s.close()
except Exception as e:
    print("❌ TCP failed:", repr(e))