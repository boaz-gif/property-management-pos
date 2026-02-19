const Database = require('../../utils/database');

class MpesaSettingsService {
  static async getEffectiveSettings({ propertyId, organizationId } = {}) {
    const envSettings = this.getEnvSettings();

    const propertyIdInt = propertyId !== undefined && propertyId !== null ? parseInt(propertyId, 10) : null;
    const organizationIdInt = organizationId !== undefined && organizationId !== null ? parseInt(organizationId, 10) : null;

    if (propertyIdInt) {
      const res = await Database.query(
        `
        SELECT *
        FROM mpesa_settings
        WHERE property_id = $1 AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [propertyIdInt]
      );
      if (res.rows.length > 0) return this.mergeSettings(envSettings, res.rows[0]);
    }

    if (organizationIdInt) {
      const res = await Database.query(
        `
        SELECT *
        FROM mpesa_settings
        WHERE organization_id = $1 AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [organizationIdInt]
      );
      if (res.rows.length > 0) return this.mergeSettings(envSettings, res.rows[0]);
    }

    return envSettings;
  }

  static getEnvSettings() {
    return {
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
      consumer_key: process.env.MPESA_CONSUMER_KEY || null,
      consumer_secret: process.env.MPESA_CONSUMER_SECRET || null,
      passkey: process.env.MPESA_PASSKEY || null,
      shortcode: process.env.MPESA_SHORTCODE || null,
      party_b: process.env.MPESA_PARTY_B || process.env.MPESA_SHORTCODE || null,
      callback_base_url: process.env.MPESA_CALLBACK_BASE_URL || null,
      account_reference_prefix: process.env.MPESA_ACCOUNT_REFERENCE_PREFIX || 'RENT',
      webhook_token: process.env.MPESA_WEBHOOK_TOKEN || null,
    };
  }

  static mergeSettings(base, override) {
    const merged = { ...base };
    for (const key of Object.keys(base)) {
      if (override[key] !== undefined && override[key] !== null && override[key] !== '') {
        merged[key] = override[key];
      }
    }
    if (override.environment) merged.environment = override.environment;
    if (override.callback_base_url) merged.callback_base_url = override.callback_base_url;
    if (override.account_reference_prefix) merged.account_reference_prefix = override.account_reference_prefix;
    return merged;
  }
}

module.exports = MpesaSettingsService;

