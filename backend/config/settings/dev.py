from .base import *  # noqa

DEBUG = True

# Show emails in terminal during dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Django Debug Toolbar
INSTALLED_APPS += ["debug_toolbar"]  # noqa
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa
INTERNAL_IPS = ["127.0.0.1"]

# Looser CORS for local dev
CORS_ALLOW_ALL_ORIGINS = True
