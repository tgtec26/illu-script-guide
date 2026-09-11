"""사이트 다운로드용 zip 생성. Vercel buildCommand에서 실행한다.

docs/dl/setup-mac.zip      setup-mac.command (실행 권한 유지)
docs/dl/setup-windows.zip  setup-windows.cmd + setup-windows.ps1 (cmd가 옆의 ps1을 부른다)
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "dl")
BUNDLES = {
    "setup-mac.zip": [("setup-mac.command", 0o755)],
    "setup-windows.zip": [("setup-windows.cmd", 0o644), ("setup-windows.ps1", 0o644)],
}

os.makedirs(OUT, exist_ok=True)
for name, files in BUNDLES.items():
    path = os.path.join(OUT, name)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, mode in files:
            source = os.path.join(ROOT, filename)
            info = zipfile.ZipInfo.from_file(source, filename)
            info.create_system = 3                          # Unix로 표시해야 macOS가 아래 모드를 읽는다
            info.external_attr = (0o100000 | mode) << 16   # 유닉스 파일 모드 (압축 해제 시 +x 복원)
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(source, "rb") as f:
                zf.writestr(info, f.read())
    print("wrote", os.path.relpath(path, ROOT))
