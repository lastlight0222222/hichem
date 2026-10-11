let cachedKeys;
let cachedKeysUntil = 0;

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function decodeTokenPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getSigningKeys(teamDomain) {
  if (cachedKeys && Date.now() < cachedKeysUntil) {
    return cachedKeys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);

  if (!response.ok) {
    throw new Error('Could not load Cloudflare Access signing keys.');
  }

  const certificateSet = await response.json();

  if (!Array.isArray(certificateSet.keys)) {
    throw new Error('Cloudflare Access returned an invalid signing-key set.');
  }

  cachedKeys = certificateSet.keys;
  cachedKeysUntil = Date.now() + 5 * 60 * 1000;
  return cachedKeys;
}

export async function requireAccess(request, env) {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const audience = env.ACCESS_AUD?.trim();
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!teamDomain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain) || !audience || !assertion) {
    return false;
  }

  try {
    const parts = assertion.split('.');

    if (parts.length !== 3) {
      return false;
    }

    const header = decodeTokenPart(parts[0]);
    const claims = decodeTokenPart(parts[1]);

    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenAudiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

    if (
      claims.iss !== `https://${teamDomain}` ||
      !tokenAudiences.includes(audience) ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= now ||
      (Number.isFinite(claims.nbf) && claims.nbf > now)
    ) {
      return false;
    }

    const signingKey = (await getSigningKeys(teamDomain)).find(key => key.kid === header.kid);

    if (!signingKey) {
      return false;
    }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      signingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    return signatureValid;
  } catch (error) {
    console.error('Cloudflare Access token validation failed:', error.message);
    return false;
  }
}
