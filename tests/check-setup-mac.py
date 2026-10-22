"""Run setup in disposable fixtures; never touch installed apps or user settings."""
import os
import plistlib
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "setup-mac.command").read_text()


def check(names, explicit=None, version=None):
    with tempfile.TemporaryDirectory(prefix="illu-setup-test-") as tmp:
        base = Path(tmp)
        apps = base / "Applications"
        apps.mkdir()
        home = base / "user-settings"
        repo = base / "repo"
        repo.mkdir()
        scripts = repo / "스크립트" / "06_도형"
        scripts.mkdir(parents=True)
        (scripts / "테스트.jsx").write_text("// fixture")
        (repo / "스크립트" / "00_세팅").mkdir()
        (repo / "스크립트" / "00_세팅" / "cjhaction_261022.aia").write_text("new action")
        (repo / "cjhmac261022.kys").write_bytes(b"mac keys")
        (repo / "cjhwin261022.kys").write_bytes(b"win keys")
        for name in names:
            app = apps / name
            (app / "Presets.localized" / "ko_KR").mkdir(parents=True)
            info = app / "Adobe Illustrator.app" / "Contents" / "Info.plist"
            info.parent.mkdir(parents=True)
            info.write_bytes(plistlib.dumps({"CFBundleShortVersionString": "31.0.0"}))
        # Redirect source paths, not the real HOME environment variable.
        code = SOURCE.replace("/Applications", str(apps)).replace("$HOME", str(home))
        runner = repo / "setup-mac.command"
        runner.write_text(code)
        env = {k: v for k, v in os.environ.items() if k not in ("ILLUSTRATOR_APP_DIR", "ILLUSTRATOR_VER")}
        if explicit:
            env["ILLUSTRATOR_APP_DIR"] = str(apps / explicit)
        if version:
            env["ILLUSTRATOR_VER"] = version
        # Script folders are writable before setup, so sudo cannot be called.
        for name in names:
            (apps / name / "Presets.localized" / "ko_KR" / "스크립트").mkdir()
            # An action file left by an earlier setup must not survive next to the new one.
            old = apps / name / "Presets.localized" / "ko_KR" / "스크립트" / "00_세팅"
            old.mkdir()
            (old / "cjhaction_260624.aia").write_text("old action")
        result = subprocess.run(["bash", str(runner)], env=env, text=True, capture_output=True)
        assert result.returncode == 0, result.stdout + result.stderr
        expected = [explicit] if explicit else names
        for name in names:
            loader = apps / name / "Presets.localized" / "ko_KR" / "스크립트" / "06_도형" / "테스트.jsx"
            assert loader.exists() == (name in expected), (name, result.stdout)
            if loader.exists():
                assert str(scripts / "테스트.jsx") in loader.read_text()
        for name in expected:
            actions = apps / name / "Presets.localized" / "ko_KR" / "스크립트" / "00_세팅"
            assert sorted(p.name for p in actions.glob("*.aia")) == ["cjhaction_261022.aia"], result.stdout
            ver = version if explicit and version else ("31.0.0 Beta" if "Beta" in name else "30")
            settings = home / "Library" / "Preferences" / ("Adobe Illustrator " + ver + " Settings") / "ko_KR"
            assert (settings / "cjhmac261022.kys").read_bytes() == b"mac keys", result.stdout
            assert not (settings / "cjhwin261022.kys").exists(), result.stdout


stable = "Adobe Illustrator 2026"
beta = "Adobe Illustrator (Beta)"
check([stable, beta])
check([stable])
check([beta])
check([stable, beta], beta, "31.0.0 Beta")
check([stable, beta], stable)
print("setup-mac: 5 fixture scenarios passed")
