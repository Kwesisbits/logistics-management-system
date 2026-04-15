import os

from huggingface_hub import hf_hub_download

MODEL_REPO = "TheBloke/Mistral-7B-Instruct-v0.3-GGUF"
MODEL_FILE = "mistral-7b-instruct-v0.3.Q4_K_M.gguf"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


def download():
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, MODEL_FILE)
    if os.path.exists(model_path):
        print(f"Model already exists at {model_path}")
        return model_path
    print(f"Downloading {MODEL_FILE} (~4GB)...")
    path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILE,
        local_dir=MODELS_DIR,
        local_dir_use_symlinks=False,
    )
    print(f"Downloaded to: {path}")
    return path


if __name__ == "__main__":
    download()

