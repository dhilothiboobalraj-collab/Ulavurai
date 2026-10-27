import unittest

from backend.deployment import validate_production_environment


class ProductionEnvironmentTests(unittest.TestCase):
    def test_local_development_does_not_require_production_settings(self):
        validate_production_environment({"APP_ENV": "development"})

    def test_render_requires_supabase_postgres_and_cors_configuration(self):
        with self.assertRaisesRegex(
            RuntimeError,
            "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, "
            "CORS_ALLOWED_ORIGINS",
        ):
            validate_production_environment({"APP_ENV": "production"})

    def test_valid_render_configuration_is_accepted(self):
        validate_production_environment(
            {
                "APP_ENV": "production",
                "SUPABASE_URL": "https://project.supabase.co",
                "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
                "DATABASE_URL": "postgresql://user:password@db.example/app",
                "CORS_ALLOWED_ORIGINS": "https://seasonsense.vercel.app",
            }
        )

    def test_vercel_does_not_require_cors_but_requires_persistent_database(self):
        environment = {
            "SUPABASE_URL": "https://project.supabase.co",
            "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
            "DATABASE_URL": "postgres://user:password@db.example/app",
        }
        validate_production_environment(environment, is_vercel=True)

        del environment["DATABASE_URL"]
        with self.assertRaisesRegex(RuntimeError, "DATABASE_URL"):
            validate_production_environment(environment, is_vercel=True)

    def test_production_rejects_non_https_supabase_url(self):
        with self.assertRaisesRegex(RuntimeError, "absolute HTTPS"):
            validate_production_environment(
                {
                    "APP_ENV": "production",
                    "SUPABASE_URL": "http://project.supabase.co",
                    "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
                    "DATABASE_URL": "postgresql://user:password@db.example/app",
                    "CORS_ALLOWED_ORIGINS": "https://seasonsense.vercel.app",
                }
            )

    def test_production_rejects_sqlite_database(self):
        with self.assertRaisesRegex(RuntimeError, "PostgreSQL"):
            validate_production_environment(
                {
                    "APP_ENV": "production",
                    "SUPABASE_URL": "https://project.supabase.co",
                    "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
                    "DATABASE_URL": "sqlite:///predictions.db",
                    "CORS_ALLOWED_ORIGINS": "https://seasonsense.vercel.app",
                }
            )

    def test_production_rejects_postgres_url_without_host(self):
        with self.assertRaisesRegex(RuntimeError, "absolute PostgreSQL"):
            validate_production_environment(
                {
                    "APP_ENV": "production",
                    "SUPABASE_URL": "https://project.supabase.co",
                    "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
                    "DATABASE_URL": "postgresql:///app",
                    "CORS_ALLOWED_ORIGINS": "https://seasonsense.vercel.app",
                }
            )


if __name__ == "__main__":
    unittest.main()
