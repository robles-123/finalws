from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'VPAA API'

    def ready(self):
        """App initialization hook"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info('VPAA API app loaded')
