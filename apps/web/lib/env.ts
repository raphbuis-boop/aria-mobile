function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultAgentId: () => optional("DEFAULT_AGENT_ID"),
  leadWebhookSecret: () => optional("LEAD_WEBHOOK_SECRET"),
  transcriptWebhookSecret: () => optional("TRANSCRIPT_WEBHOOK_SECRET"),
  cronSecret: () => optional("CRON_SECRET"),

  supabaseUrl: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.EXPO_PUBLIC_SUPABASE_URL,
    ),
  supabasePublishableKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),
  anthropicModel: () => process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  openaiApiKey: () => optional("OPENAI_API_KEY"),
  embeddingModel: () =>
    process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",

  twilioAccountSid: () => required("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: () => required("TWILIO_AUTH_TOKEN"),
  twilioFromNumber: () => optional("TWILIO_FROM_NUMBER"),
  twilioMessagingServiceSid: () => optional("TWILIO_MESSAGING_SERVICE_SID"),

  resoBaseUrl: () => optional("RESO_WEB_API_BASE_URL"),
  resoTokenUrl: () => optional("RESO_TOKEN_URL"),
  resoClientId: () => optional("RESO_CLIENT_ID"),
  resoClientSecret: () => optional("RESO_CLIENT_SECRET"),
  resoBearerToken: () => optional("RESO_BEARER_TOKEN"),

  docusignBasePath: () =>
    process.env.DOCUSIGN_BASE_PATH ?? "https://demo.docusign.net/restapi",
  docusignOAuthBasePath: () =>
    process.env.DOCUSIGN_OAUTH_BASE_PATH ?? "account-d.docusign.com",
  docusignIntegrationKey: () => optional("DOCUSIGN_INTEGRATION_KEY"),
  docusignUserId: () => optional("DOCUSIGN_USER_ID"),
  docusignAccountId: () => optional("DOCUSIGN_ACCOUNT_ID"),
  docusignRsaPrivateKey: () => optional("DOCUSIGN_RSA_PRIVATE_KEY"),
  docusignPurchaseTemplateId: () => optional("DOCUSIGN_TEMPLATE_PURCHASE_ID"),

  metaAppSecret: () => optional("META_APP_SECRET"),
  metaVerifyToken: () => optional("META_VERIFY_TOKEN"),
  zillowWebhookSecret: () => optional("ZILLOW_WEBHOOK_SECRET"),
  realtorWebhookSecret: () => optional("REALTOR_WEBHOOK_SECRET"),
  n8nWebhookUrl: () => optional("N8N_WEBHOOK_URL"),
};
