import { env } from "@/lib/env";

type DocusignToken = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function docusignAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const integrationKey = env.docusignIntegrationKey();
  const userId = env.docusignUserId();
  const privateKey = env.docusignRsaPrivateKey()?.replaceAll("\\n", "\n");
  if (!integrationKey || !userId || !privateKey) {
    throw new Error("DocuSign JWT credentials are incomplete");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: integrationKey,
      sub: userId,
      aud: env.docusignOAuthBasePath(),
      iat: now,
      exp: now + 4000,
      scope: "signature impersonation",
    }),
  ).toString("base64url");

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${header}.${payload}.${signature}`;

  const response = await fetch(
    `https://${env.docusignOAuthBasePath()}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`DocuSign OAuth failed (${response.status})`);
  }

  const json = (await response.json()) as DocusignToken;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000 - 60_000,
  };
  return cachedToken.value;
}

export async function createDraftEnvelopeFromTemplate(input: {
  templateId: string;
  emailSubject: string;
  roles: Array<{
    roleName: string;
    name: string;
    email: string;
    tabs?: Record<string, string>;
  }>;
}) {
  const accountId = env.docusignAccountId();
  if (!accountId) throw new Error("DOCUSIGN_ACCOUNT_ID is not set");

  const token = await docusignAccessToken();
  const response = await fetch(
    `${env.docusignBasePath()}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "created",
        emailSubject: input.emailSubject,
        templateId: input.templateId,
        templateRoles: input.roles.map((role) => ({
          roleName: role.roleName,
          name: role.name,
          email: role.email,
          tabs: {
            textTabs: Object.entries(role.tabs ?? {}).map(([tabLabel, value]) => ({
              tabLabel,
              value,
            })),
          },
        })),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DocuSign envelope create failed: ${detail}`);
  }

  return (await response.json()) as { envelopeId: string };
}

export async function sendEnvelope(envelopeId: string) {
  const accountId = env.docusignAccountId();
  if (!accountId) throw new Error("DOCUSIGN_ACCOUNT_ID is not set");
  const token = await docusignAccessToken();

  const response = await fetch(
    `${env.docusignBasePath()}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "sent" }),
    },
  );

  if (!response.ok) {
    throw new Error(`DocuSign send failed (${response.status})`);
  }
}
