def setup_models():
    from .database import Configuration  # This imports models after db has been initialized
