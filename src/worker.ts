export interface Env {
  MEDIA_BUCKET: R2Bucket;
  PUBLIC_URL: string;
  ASSETS: Fetcher;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|twitterbot|discordbot|whatsapp|telegrambot|linkedinbot|slackbot|skypeuripreview|applebot|googlebot|bingbot/i;

const RESERVED_ROUTES = new Set([
  "admin",
  "api",
  "auth",
  "battles",
  "beats",
  "host",
  "profile",
  "releases",
  "signin",
  "vault",
  "producers",
  "_next",
]);

const SUPABASE_URL = "https://eojyxigqarmhnfcnytso.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Pa4KzpfTJQaKbheWKshmfg_K8EcvL2n";

interface OgMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
}

function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string" || url.trim() === "" || url.includes("default-avatar")) {
    return "https://beatsandpieces.ro/og-default.png";
  }
  let clean = url.trim();
  if (clean.startsWith("/")) {
    clean = `https://beatsandpieces.ro${clean}`;
  }
  try {
    return encodeURI(decodeURI(clean));
  } catch {
    return clean;
  }
}

async function resolveDynamicMetadata(pathname: string): Promise<OgMetadata | null> {
  const cleanPath = pathname.replace(/\/+$/, "");

  // 1. /battles/:id
  if (cleanPath.startsWith("/battles/")) {
    const battleId = cleanPath.slice("/battles/".length).split("/")[0].trim();
    if (!battleId) return null;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/battles?or=(id.eq.${encodeURIComponent(battleId)},slug.eq.${encodeURIComponent(battleId)})&select=title,description,cover_image&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ title?: string; description?: string; cover_image?: string }>;
        if (rows && rows.length > 0 && rows[0].title) {
          const b = rows[0];
          return {
            title: `${b.title} | Beats & Pieces`,
            description: b.description || `Check out ${b.title} on Beats & Pieces`,
            image: normalizeImageUrl(b.cover_image),
            url: `https://beatsandpieces.ro/battles/${battleId}`,
          };
        }
      }
    } catch {}
    return null;
  }

  // 2. /producers/:id
  if (cleanPath.startsWith("/producers/")) {
    const producerId = cleanPath.slice("/producers/".length).split("/")[0].trim();
    if (!producerId) return null;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/producers?or=(id.eq.${encodeURIComponent(producerId)},links->>handle.eq.${encodeURIComponent(producerId)})&select=id,nickname,avatar_url,bio&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id?: string; nickname?: string; avatar_url?: string; bio?: string }>;
        if (rows && rows.length > 0) {
          const p = rows[0];
          const name = p.nickname || p.id || producerId;
          return {
            title: `${name} | Beats & Pieces`,
            description: `${name}'s profile on Beats & Pieces`,
            image: normalizeImageUrl(p.avatar_url),
            url: `https://beatsandpieces.ro/producers/${producerId}`,
          };
        }
      }
    } catch {}
    return null;
  }

  // 3. /:username (root slug)
  const slug = cleanPath.replace(/^\//, "").split("/")[0].trim();
  if (slug && !RESERVED_ROUTES.has(slug) && !slug.includes(".")) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/producers?or=(id.eq.${encodeURIComponent(slug)},links->>handle.eq.${encodeURIComponent(slug)})&select=id,nickname,avatar_url,bio&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id?: string; nickname?: string; avatar_url?: string; bio?: string }>;
        if (rows && rows.length > 0) {
          const p = rows[0];
          const name = p.nickname || p.id || slug;
          return {
            title: `${name} | Beats & Pieces`,
            description: `${name}'s profile on Beats & Pieces`,
            image: normalizeImageUrl(p.avatar_url),
            url: `https://beatsandpieces.ro/${slug}`,
          };
        }
      }
    } catch {}
  }

  return null;
}

function rewriteHtmlMeta(response: Response, meta: OgMetadata): Response {
  let hasOgUrl = false;

  const rewriter = new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on("meta[property='og:title']", {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on("meta[name='twitter:title']", {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on("meta[name='description']", {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("meta[property='og:description']", {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("meta[name='twitter:description']", {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("meta[property='og:image']", {
      element(el) {
        el.setAttribute("content", meta.image);
      },
    })
    .on("meta[name='twitter:image']", {
      element(el) {
        el.setAttribute("content", meta.image);
      },
    })
    .on("meta[property='og:url']", {
      element(el) {
        hasOgUrl = true;
        el.setAttribute("content", meta.url);
      },
    })
    .on("meta[property='og:image:width']", {
      element(el) {
        el.remove();
      },
    })
    .on("meta[property='og:image:height']", {
      element(el) {
        el.remove();
      },
    })
    .on("meta[name='twitter:image:width']", {
      element(el) {
        el.remove();
      },
    })
    .on("meta[name='twitter:image:height']", {
      element(el) {
        el.remove();
      },
    })
    .on("meta[name='robots']", {
      element(el) {
        el.remove();
      },
    })
    .on("head", {
      element(el) {
        if (!hasOgUrl) {
          el.append(`<meta property="og:url" content="${meta.url}" />`, { html: true });
        }
      },
    });

  const transformed = rewriter.transform(response);
  return new Response(transformed.body, {
    status: 200,
    headers: transformed.headers,
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

function getContentType(key: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.endsWith('.opus')) return 'audio/ogg; codecs=opus';
  if (lowerKey.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerKey.endsWith('.flac')) return 'audio/flac';
  if (lowerKey.endsWith('.wav')) return 'audio/wav';
  if (lowerKey.endsWith('.m4a') || lowerKey.endsWith('.mp4')) return 'audio/mp4';
  if (lowerKey.endsWith('.aac')) return 'audio/aac';
  if (lowerKey.endsWith('.aif') || lowerKey.endsWith('.aiff')) return 'audio/aiff';
  if (lowerKey.endsWith('.webp')) return 'image/webp';
  if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerKey.endsWith('.png')) return 'image/png';
  if (lowerKey.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle /api/* routes
    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/upload' && request.method === 'POST') {
          return await handleUpload(request, env);
        }

        if (url.pathname === '/api/list' && request.method === 'GET') {
          const prefix = url.searchParams.get('prefix') || '';
          const objects = await env.MEDIA_BUCKET.list({ prefix, limit: 500 });
          return jsonResponse({
            objects: objects.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }))
          });
        }

        if (url.pathname.startsWith('/api/media/')) {
          const key = decodeURIComponent(url.pathname.slice('/api/media/'.length));
          if (!key) return errorResponse('Missing file key', 400);

          if (request.method === 'GET' || request.method === 'HEAD') {
            return await handleGetMedia(request, env, key);
          }

          if (request.method === 'DELETE') {
            return await handleDeleteMedia(request, env, key);
          }
        }

        return errorResponse('API Route Not Found', 404);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return errorResponse(message, 500);
      }
    }

    // Check if this is a crawler / bot looking for Open Graph previews
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = BOT_UA_REGEX.test(userAgent) || url.searchParams.has('preview');

    if (isCrawler) {
      const meta = await resolveDynamicMetadata(url.pathname);
      if (meta) {
        const assetResponse = await env.ASSETS.fetch(request);
        return rewriteHtmlMeta(assetResponse, meta);
      }
    }

    // Serve static asset directly
    return await env.ASSETS.fetch(request);
  },
};

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return errorResponse('Invalid form data', 400);
  }

  const file = formData.get('file');
  let folder = formData.get('folder');
  let filename = formData.get('filename') as string | null;

  if (!file || !(file instanceof File)) {
    return errorResponse('Missing or invalid file', 400);
  }

  const validPrefixes = ['submissions', 'beats', 'samples', 'battles', 'releases', 'avatars', 'audio', 'covers', 'images'];
  if (!folder || typeof folder !== 'string') {
    folder = 'submissions';
  }
  folder = folder.replace(/^\/+|\/+$/g, '');

  const rootFolder = folder.split('/')[0];
  if (!validPrefixes.includes(rootFolder)) {
    return errorResponse(`Invalid folder prefix. Must start with one of: ${validPrefixes.join(', ')}`, 400);
  }

  const ext = file.name.substring(file.name.lastIndexOf('.'));
  let finalKey: string;
  if (filename) {
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    finalKey = `${folder}/${filename}`;
  } else {
    finalKey = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  }

  const arrayBuffer = await file.arrayBuffer();

  const customMetadata: Record<string, string> = {
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  };

  const uploadType = (formData.get('type') as string) || (formData.get('category') as string);
  if (uploadType) customMetadata.type = uploadType;

  const battleId = formData.get('battleId') as string;
  if (battleId) customMetadata.battleId = battleId;

  const userId = formData.get('userId') as string;
  if (userId) customMetadata.userId = userId;

  const beatmakerTag = formData.get('beatmakerTag') as string;
  if (beatmakerTag) customMetadata.beatmakerTag = beatmakerTag;

  const beatTitle = formData.get('beatTitle') as string;
  if (beatTitle) customMetadata.beatTitle = beatTitle;

  await env.MEDIA_BUCKET.put(finalKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || getContentType(finalKey),
    },
    customMetadata,
  });

  return jsonResponse({
    key: finalKey,
    url: `/api/media/${finalKey}`,
    size: file.size,
    type: file.type,
  });
}

function getCandidateKeys(key: string): string[] {
  const candidates = [key];
  if (!key.startsWith('images/')) {
    candidates.push(`images/${key}`);
  }
  if (key.startsWith('avatars/')) {
    candidates.push(`images/${key}`);
  }
  if (key.startsWith('covers/battles/')) {
    candidates.push(`images/${key}`);
    candidates.push(`covers/${key.replace('covers/battles/', '')}`);
  }
  if (key.startsWith('covers/releases/')) {
    candidates.push(`images/${key}`);
  }
  if (key.startsWith('covers/') && !key.startsWith('covers/battles/') && !key.startsWith('covers/releases/')) {
    candidates.push(`images/covers/battles/${key.replace('covers/', '')}`);
    candidates.push(`images/${key}`);
  }
  if (key.startsWith('images/')) {
    candidates.push(key.replace(/^images\//, ''));
  }
  if (key.startsWith('images/covers/battles/')) {
    candidates.push(`covers/battles/${key.replace('images/covers/battles/', '')}`);
    candidates.push(`covers/${key.replace('images/covers/battles/', '')}`);
  }
  if (key.startsWith('images/covers/releases/')) {
    candidates.push(`covers/releases/${key.replace('images/covers/releases/', '')}`);
  }
  if (key.startsWith('images/avatars/')) {
    candidates.push(`avatars/${key.replace('images/avatars/', '')}`);
  }
  if (!key.startsWith('audio/') && (key.endsWith('.opus') || key.endsWith('.flac') || key.endsWith('.wav') || key.endsWith('.mp3'))) {
    candidates.push(`audio/${key}`);
  }
  return Array.from(new Set(candidates));
}

async function handleGetMedia(request: Request, env: Env, key: string): Promise<Response> {
  const rangeHeader = request.headers.get('Range');
  
  // Parse Range header if present
  let rangeOptions: R2GetOptions['range'] = undefined;
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(.*)/);
    if (match) {
      const start = parseInt(match[1]);
      const endStr = match[2];
      if (endStr) {
        rangeOptions = {
          offset: start,
          length: parseInt(endStr) - start + 1
        };
      } else {
        rangeOptions = { offset: start };
      }
    }
  }

  const candidateKeys = getCandidateKeys(key);
  let object: R2ObjectBody | null = null;
  let resolvedKey = key;

  for (const cKey of candidateKeys) {
    object = await env.MEDIA_BUCKET.get(cKey, { range: rangeOptions });
    if (object !== null) {
      resolvedKey = cKey;
      break;
    }
  }

  if (object === null) {
    return errorResponse('File not found', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Accept-Ranges', 'bytes');
  
  const contentType = getContentType(resolvedKey);
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  
  // Apply CORS headers
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
  }

  const status = object.range ? 206 : 200;
  if (object.range) {
    const start = object.range.offset;
    const length = object.range.length;
    const end = start + length - 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    headers.set('Content-Length', length.toString());
  } else {
    headers.set('Content-Length', object.size.toString());
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status, headers });
  }

  return new Response(object.body, { status, headers });
}

async function handleDeleteMedia(request: Request, env: Env, key: string): Promise<Response> {
  await env.MEDIA_BUCKET.delete(key);
  return jsonResponse({ success: true, key });
}
