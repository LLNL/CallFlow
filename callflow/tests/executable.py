import shutil


def test_which():
    assert shutil.which("callflow")
