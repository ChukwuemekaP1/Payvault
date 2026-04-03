//! Application configuration.
//! All settings are loaded from environment variables at startup via the
//! `config` crate + `dotenvy`. No defaults are assumed for secrets.

use serde::Deserialize;

/// Runtime environment — controls logging verbosity and behaviour guards.
#[derive(Debug, Clone, PartialEq)]
pub enum AppEnv {
    Development,
    Production,
    Test,
}

/// Deserialise AppEnv from a plain string, e.g. `APP_ENV=production`.
impl<'de> Deserialize<'de> for AppEnv {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.to_lowercase().as_str() {
            "development" => Ok(AppEnv::Development),
            "production" => Ok(AppEnv::Production),
            "test" => Ok(AppEnv::Test),
            _ => Err(serde::de::Error::custom("Invalid environment")),
        }
    }
}

/// `FromStr` allows `"production".parse::<AppEnv>()` used in `from_env()`.
impl std::str::FromStr for AppEnv {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "development" => Ok(AppEnv::Development),
            "production" => Ok(AppEnv::Production),
            "test" => Ok(AppEnv::Test),
            _ => Err(()),
        }
    }
}

/// Flat config struct — every field maps 1-to-1 to an env variable.
/// Cloned cheaply via Arc<AppConfig> shared across all handler threads.
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct AppConfig {
    // ── Database ──────────────────────────────────────────────────────────────
    pub database_url: String,

    // ── Redis ─────────────────────────────────────────────────────────────────
    pub redis_url: String,

    // ── JWT — HS256 secret + TTLs in minutes ──────────────────────────────────
    pub jwt_secret: String,
    pub jwt_access_ttl: i64,  // short-lived (e.g. 15 min)
    pub jwt_refresh_ttl: i64, // long-lived  (e.g. 10 080 min = 7 days)

    // ── Server ────────────────────────────────────────────────────────────────
    pub app_env: AppEnv,
    pub app_port: u16,

    // ── SMTP (lettre STARTTLS) ─────────────────────────────────────────────────
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub smtp_from: String,

    // ── Paystack ──────────────────────────────────────────────────────────────
    pub paystack_secret_key: String, // used for Paystack API calls
    pub paystack_webhook_secret: String, // used to verify inbound webhook HMAC

    // ── Seeded admin account ───────────────────────────────────────────────────
    pub admin_email: String,
    pub admin_password: String,
}

#[allow(dead_code)]
impl AppConfig {
    /// Reads every field from the process environment.
    /// Fails fast at startup if any required variable is missing.
    pub fn from_env() -> Result<Self, config::ConfigError> {
        // config::Environment maps UPPER_CASE env vars to lowercase field names.
        let settings = config::Config::builder()
            .add_source(config::Environment::default())
            .build()?;

        Ok(Self {
            database_url: settings.get_string("DATABASE_URL")?,
            redis_url: settings.get_string("REDIS_URL")?,
            jwt_secret: settings.get_string("JWT_SECRET")?,
            jwt_access_ttl: settings.get_int("JWT_ACCESS_TTL")? as i64,
            jwt_refresh_ttl: settings.get_int("JWT_REFRESH_TTL")? as i64,
            // Gracefully defaults to Development if APP_ENV is absent or unrecognised.
            app_env: settings
                .get_string("APP_ENV")
                .unwrap_or_else(|_| "development".to_string())
                .parse()
                .unwrap_or(AppEnv::Development),
            // Fall back to PORT env var (Render sets PORT, not APP_PORT)
            app_port: settings
                .get_int("APP_PORT")
                .or_else(|_| settings.get_int("PORT"))? as u16,
            smtp_host: settings.get_string("SMTP_HOST")?,
            smtp_port: settings.get_int("SMTP_PORT")? as u16,
            smtp_username: settings.get_string("SMTP_USERNAME")?,
            smtp_password: settings.get_string("SMTP_PASSWORD")?,
            smtp_from: settings.get_string("SMTP_FROM")?,
            paystack_secret_key: settings.get_string("PAYSTACK_SECRET_KEY")?,
            paystack_webhook_secret: settings.get_string("PAYSTACK_WEBHOOK_SECRET")?,
            admin_email: settings.get_string("ADMIN_EMAIL")?,
            admin_password: settings.get_string("ADMIN_PASSWORD")?,
        })
    }

    /// Convenience guard used to enable production-only behaviour
    /// (e.g. strict CORS, extra audit logging).
    pub fn is_production(&self) -> bool {
        self.app_env == AppEnv::Production
    }
}
