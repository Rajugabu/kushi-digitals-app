export type GenerationMode =
  | "single_portrait_style"
  | "double_image_composition"
  | "banner_or_template_style";

export type StudioStylePreset = {
  id: string;
  mode: GenerationMode;
  photosRequired: 1 | 2;
  maxPhotos?: 1 | 2;
  creditCost: 3 | 4 | 5 | 6;
  supportedRatios: string[];
  quality: "low" | "medium" | "high";
  prompt: string;
  upscale: "none" | "preferred";
};

const PORTRAIT_IDENTITY_LOCK = `
TASK: Perform an identity-preserving edit of reference image 1. Reference image 1 is the only authoritative identity source.

CHANGE ONLY the requested artistic treatment, background, lighting, color atmosphere, and surface-level finish. KEEP EVERYTHING ELSE THE SAME unless the style request explicitly says otherwise.

IDENTITY MUST REMAIN LOCKED:
- Depict the exact same person, not a similar-looking or newly invented person.
- Preserve exact age, skin tone, facial structure, facial proportions, face width and length, forehead, hairline, jawline, chin, cheeks, and ears.
- Preserve exact eye shape, eye size, eye spacing, iris color, eyebrows, nose bridge, nose width, nose tip, nostrils, lip shape, mouth width, teeth, and natural smile or expression.
- Preserve hairstyle, gaze direction, head angle, pose, body proportions, and all distinctive facial marks.
- Preserve clothing colors, garment design, and jewelry unless the requested style explicitly requires a controlled clothing change.
- Keep natural skin texture and real human anatomy. Do not apply beauty filters or plastic skin.

DO NOT beautify, slim, widen, reshape, symmetrize, rejuvenate, age, face-swap, reconstruct, or reinterpret the face. Do not change the expression, eye direction, nose, lips, teeth, jaw, hairline, body shape, or gender presentation. Artistic styling must be applied around the locked identity, not by redesigning the person.

COMPOSITION AND QUALITY:
- Keep the full head and all hair visible with comfortable space above the subject.
- Do not crop the forehead, chin, hands, jewelry, or important clothing.
- Produce one polished composition with realistic anatomy and clean high-detail rendering.
- No watermarks, signatures, logos, duplicate faces, extra people, distorted anatomy, extra fingers, text, borders, or mockup frames.

FINAL IDENTITY CHECK: The finished result must unquestionably be the exact same person from reference image 1 at first glance. Preserve identity and facial geometry exactly; change only the requested style and environment.
`.trim();

const TWO_IMAGE_IDENTITY_LOCK = `
TASK: Create a controlled two-image composition. Reference image 1 is the primary subject. Reference image 2 is the secondary subject or compositional reference.

CHANGE ONLY the requested composition, artistic treatment, background, lighting, color atmosphere, and surface-level finish. KEEP the identities and identity-bearing facial geometry unchanged.

IDENTITY MUST REMAIN LOCKED:
- Depict the exact same person from reference image 1, not a similar-looking or newly invented person.
- If reference image 2 contains another person, preserve that person's identity separately and exactly.
- For each person, preserve exact age, skin tone, face shape, facial proportions, forehead, hairline, jawline, chin, cheeks, ears, eyes, eye spacing, eyebrows, nose, lips, mouth, teeth, expression, hairstyle, gaze, and distinctive marks.
- Preserve natural pose and body proportions unless the requested composition clearly requires repositioning.
- Preserve clothing colors, garment design, and jewelry unless the requested style explicitly requires a controlled clothing change.

DO NOT merge faces, blend facial traits, swap identities, duplicate subjects, invent a third person, beautify, reshape, symmetrize, rejuvenate, age, or reinterpret either face. Never copy the eyes, nose, mouth, hairstyle, or facial structure of one person onto the other.

COMPOSITION AND QUALITY:
- Keep both heads, hair, and faces complete, distinct, unobstructed, and naturally proportioned.
- Do not crop foreheads, chins, hands, jewelry, or important clothing.
- Produce one clean final composition with realistic anatomy and premium detail.
- No watermarks, signatures, logos, placeholder text, duplicate faces, extra people, distorted hands, borders, or mockup frames.

FINAL IDENTITY CHECK: Every person in the finished result must remain immediately recognizable as the exact person from the corresponding reference image. Preserve facial identity and geometry; change only the requested design treatment.
`.trim();

const CHIBI_IDENTITY_GUIDE = `
TASK: Transform reference image 1 into a chibi illustration while retaining strong, unmistakable identity cues.

Preserve the same hairstyle, hairline direction, skin tone, age cues, expression, eye color, eyebrow character, nose and mouth cues, clothing colors, jewelry, and distinctive marks. Use intentional chibi proportions, but do not replace the subject with a generic character or a different person.

Keep the full head, hair, body, and important clothing visible. Use clean anatomy, two arms, two hands, and five fingers per visible hand. No duplicate character, extra person, watermark, signature, logo, text, border, or mockup frame.

FINAL IDENTITY CHECK: Even in chibi form, the character must clearly and immediately represent the same person from reference image 1.
`.trim();

const PREMIUM_PORTRAIT_FINISH = `
QUALITY TARGET:
- Deliver a premium professional portrait result with polished composition, balanced lighting, elegant depth, clean anatomy, crisp facial detail, realistic skin texture, refined hair strands, and accurate garment texture.
- Preserve a natural human look with believable skin tone and subtle texture; avoid plastic skin, heavy smoothing, muddy textures, harsh halos, awkward crops, low-detail rendering, or cheap AI artifacts.
- Keep the final result premium, print-worthy, and visually impressive for paid customer delivery.
`.trim();

const PREMIUM_TWO_IMAGE_FINISH = `
QUALITY TARGET:
- Deliver a premium professional two-person composition with both faces fully clear, individually recognizable, naturally proportioned, and attractively balanced in the frame.
- Preserve realistic skin tone, garment texture, jewelry detail, clean anatomy, elegant lighting, and premium festive styling.
- Avoid face merging, duplicate features, distorted hands, warped jewelry, cluttered layout, muddy textures, text errors, low-detail rendering, or cheap AI artifacts.
- Keep the final result polished, print-worthy, and suitable for paid customer delivery.
`.trim();

const PREMIUM_CHIBI_FINISH = `
QUALITY TARGET:
- Deliver a premium polished chibi illustration with strong recognizable identity cues, expressive clean eyes, attractive proportions, soft dimensional shading, neat costume detail, and a vibrant premium illustrated background.
- Keep the character cute and stylized while still clearly representing the same real person.
- Avoid generic faces, messy anatomy, extra fingers, duplicate characters, clutter, muddy colors, or cheap AI artifacts.
`.trim();

function portraitPreset(
  id: string,
  stylePrompt: string,
  supportedRatios = ["2:3", "3:2"],
  identityPrompt = PORTRAIT_IDENTITY_LOCK,
  finishingPrompt = PREMIUM_PORTRAIT_FINISH,
): StudioStylePreset {
  return {
    id,
    mode: "single_portrait_style",
    photosRequired: 1,
    creditCost: 3,
    supportedRatios,
    quality: "high",
    prompt: `${identityPrompt}\n\nREQUESTED STYLE TREATMENT:\n${stylePrompt}\n\n${finishingPrompt}\n\nApply only this requested treatment while obeying every identity and preservation constraint above.`,
    upscale: "preferred",
  };
}

function twoImagePreset(
  id: string,
  mode: Exclude<GenerationMode, "single_portrait_style">,
  stylePrompt: string,
  supportedRatios: string[],
  finishingPrompt = PREMIUM_TWO_IMAGE_FINISH,
): StudioStylePreset {
  return {
    id,
    mode,
    photosRequired: 2,
    creditCost: 4,
    supportedRatios,
    quality: "high",
    prompt: `${TWO_IMAGE_IDENTITY_LOCK}\n\nREQUESTED DESIGN TREATMENT:\n${stylePrompt}\n\n${finishingPrompt}\n\nApply only this requested treatment while obeying every identity and preservation constraint above.`,
    upscale: "preferred",
  };
}

export const STYLE_PRESETS: Record<string, StudioStylePreset> = {
  "ai-photo-studio": {
    id: "ai-photo-studio",
    mode: "single_portrait_style",
    photosRequired: 1,
    creditCost: 5,
    supportedRatios: ["1:1", "4:5", "3:4", "9:16", "2:3", "3:2"],
    quality: "high",
    prompt: `${PORTRAIT_IDENTITY_LOCK}\n\nApply the selected AI Photo Studio operation from the custom creation details. Enhance only the requested property or background. For identity-sensitive edits, preserve the exact person, natural anatomy, pose, expression, skin tone, and facial geometry.\n\n${PREMIUM_PORTRAIT_FINISH}`,
    upscale: "preferred",
  },

  "poster-studio": {
    id: "poster-studio",
    mode: "banner_or_template_style",
    photosRequired: 1,
    creditCost: 4,
    supportedRatios: ["1:1", "4:5", "9:16"],
    quality: "high",
    prompt: `${PORTRAIT_IDENTITY_LOCK}\n\nCreate a personalized occasion poster using the selected template direction and custom details. Prioritize clear hierarchy, clean spacing, readable text, and a polished Indian celebration design. Keep the uploaded person recognizable and do not invent facial features.`,
    upscale: "preferred",
  },

  "business-studio": {
    id: "business-studio",
    mode: "banner_or_template_style",
    photosRequired: 1,
    maxPhotos: 2,
    creditCost: 6,
    supportedRatios: ["1:1", "4:5", "9:16"],
    quality: "high",
    prompt: `Create a professional business promotional design from the supplied business details and reference images.

IMAGE ROLES:
- Image 1 is the main product, business, or owner visual. Keep it as the primary photographic subject.
- When Image 2 is supplied, use the image2Role in the custom creation details to determine whether it is a business logo or a secondary business reference.
- If Image 2 is a logo, reproduce it faithfully as a restrained branding element. Never turn the logo into a person, product, background, or decorative object, and never merge it with the subject in Image 1.

Prioritize readable business name, offer, phone number, clean typography, strong hierarchy, accurate logo placement, professional spacing, and low clutter. Do not use placeholder text, misspellings, watermarks, or decorative elements that reduce readability.`,
    upscale: "preferred",
  },

  "classic-painting": {
    id: "classic-painting",
    mode: "single_portrait_style",
    photosRequired: 1,
    creditCost: 3,
    supportedRatios: ["2:3", "3:2"],
    quality: "high",
    prompt: `Use the uploaded photo as the reference image.

Transform this blurred photo into an ultra-realistic professional DSLR portrait while keeping the EXACT SAME PERSON, SAME FACE, SAME EYES, SAME NOSE, SAME LIPS, SAME HAIRSTYLE, SAME SKIN TONE, SAME FACIAL STRUCTURE, SAME BODY POSITION, SAME POSE, and SAME EXPRESSION with 100% identity preservation.

Restore all lost details naturally, remove blur completely, recover facial features, enhance skin texture realistically, sharpen eyes, improve hair details, and increase overall image clarity to DSLR camera quality.

Apply natural lighting, realistic shadows, accurate skin tones, professional color grading, and high dynamic range. Maintain the original composition and framing without changing the person's appearance.

Create a crisp, ultra-sharp 8K resolution photograph with professional DSLR lens quality, realistic depth, natural bokeh, high-detail textures, and studio-grade image enhancement.

No face modification, no beauty filter, no artificial face generation, no face swapping, no age change, no expression change, no pose change, no body shape change. Keep the exact same identity and appearance.

Ultra-realistic, DSLR photography, 85mm lens, f/1.8 aperture, shallow depth of field, natural colors, maximum sharpness, professional portrait retouching, 8K, photorealistic.`,
    upscale: "preferred",
  },

  "digital-painting-red-petal": portraitPreset(
    "digital-painting-red-petal",
    "Create a premium digital portrait treatment with deep crimson and red-petal accents, elegant floating botanical detail, refined painterly texture, soft cinematic rim lighting, and a rich dark editorial background. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Keep the subject visually dominant and render the result with luxurious mood, crisp facial detail, and premium beauty-portrait finishing without redesigning the person.",
  ),

  "digital-painting-tropical": portraitPreset(
    "digital-painting-tropical",
    "Create a luminous tropical digital painting treatment with lush botanical atmosphere, vibrant natural greens, warm flattering light, refined foliage depth, detailed hair texture, and a premium editorial portrait composition. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Keep the subject as the clear focal point and deliver a polished high-end tropical portrait look.",
  ),

  "digital-painting-royal-pink": portraitPreset(
    "digital-painting-royal-pink",
    "Create an elegant royal-pink digital portrait treatment with delicate ornamental lighting, rich magenta and rose color harmony, graceful presentation, and a luxurious studio-style backdrop. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Polish the existing clothing presentation without redesigning the person, and render the final portrait with premium softness, crisp detail, and a regal high-end finish.",
    ["2:3"],
  ),

  "digital-painting-forest-green": portraitPreset(
    "digital-painting-forest-green",
    "Create a sophisticated forest-green artistic portrait treatment with deep emerald atmosphere, soft directional studio light, subtle natural textures, cinematic depth, and a clean premium editorial composition. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Render the portrait with elegant tonal control, crisp detail, and a refined luxury finish.",
  ),

  "digital-painting-pastel-cloud": portraitPreset(
    "digital-painting-pastel-cloud",
    "Create a dreamy pastel-cloud portrait treatment with airy lavender, blush, and pale-blue tones, soft diffused lighting, delicate painterly texture, detailed hair rendering, and an uncluttered ethereal background. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Deliver a soft premium portrait aesthetic with clean detail and graceful high-end presentation.",
  ),

  "digital-painting-aurora": portraitPreset(
    "digital-painting-aurora",
    "Create a cinematic aurora-inspired digital portrait treatment with controlled violet, cyan, and teal lighting, luminous atmospheric depth, elegant color separation, and a premium modern composition. Preserve the exact same identity, expression, face structure, hairstyle, and skin tone. Render the portrait with dramatic mood, refined detail, and a polished premium finish.",
  ),

  "wedding-banner-elegance": twoImagePreset(
    "wedding-banner-elegance",
    "banner_or_template_style",
    "Create a premium Indian wedding celebration banner composition featuring both people prominently, with tasteful gold ornament, subtle floral decoration, warm festive lighting, rich garment detail, elegant visual balance, and deliberate negative space where event text can later be added. Keep both faces fully clear, naturally attractive, and structurally unchanged. Do not render any words or dates.",
    ["3:2"],
  ),

  "double-exposure-dreamscape": twoImagePreset(
    "double-exposure-dreamscape",
    "double_image_composition",
    "Create a refined premium double-exposure artwork. Keep the person from reference image 1 as the clear primary portrait. Blend only the atmosphere, landscape, color, or meaningful non-facial details from reference image 2 into the silhouette and background. Use seamless transitions, cinematic depth, elegant lighting, and sophisticated layering. Never blend, replace, or distort facial traits.",
    ["2:3", "3:2"],
  ),

  "wedding-design-celebration": twoImagePreset(
    "wedding-design-celebration",
    "banner_or_template_style",
    "Create a luxurious wedding couple portrait design with both people naturally composed together, premium floral framing, gentle gold accents, flattering soft light, rich festive color, detailed garment and jewelry texture, and a polished album-cover aesthetic. Keep both locked faces naturally realistic and structurally unchanged. Do not add text.",
    ["2:3", "3:2"],
  ),

  "wedding-card-minimal-bloom": twoImagePreset(
    "wedding-card-minimal-bloom",
    "banner_or_template_style",
    "Create a minimalist wedding invitation-style portrait composition featuring both people, with subtle botanical blooms, refined ivory and blush color harmony, generous clean negative space, elegant lighting, and premium editorial balance. Keep both faces naturally realistic, fully visible, and structurally unchanged. Do not generate names, dates, or other text.",
    ["2:3"],
  ),

  "chibi-happy-day": portraitPreset(
    "chibi-happy-day",
    "Transform the subject into a polished high-detail chibi character with a cheerful expression, strong recognizable identity cues, the same hairstyle and clothing colors, clean expressive eyes, balanced chibi proportions, soft dimensional shading, and a bright premium illustrated background. Keep the result cute, attractive, and clearly based on the same person rather than a generic cartoon character.",
    ["2:3", "3:2"],
    CHIBI_IDENTITY_GUIDE,
    PREMIUM_CHIBI_FINISH,
  ),

  "studio-design-clean-light": portraitPreset(
    "studio-design-clean-light",
    "Create a clean professional studio portrait treatment with balanced neutral lighting, accurate natural skin tone, crisp facial and hair detail, subtle background depth, neat presentation, and a realistic premium photography finish. Change only lighting, background, and finishing while keeping the person, face, expression, pose, clothing, and body unchanged. Deliver a polished studio-quality result suitable for premium customer output.",
  ),
};

export function getStylePreset(styleId: string) {
  return STYLE_PRESETS[styleId] || null;
}
