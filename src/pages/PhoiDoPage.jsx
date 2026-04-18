/**
 * PhoiDoPage.jsx — Phối Đồ  ·  Premium Dark
 * Tone: Black + Orange + White + Blue + Fuchsia
 */
import { useState, useRef } from 'react'
import {
  Upload, Sparkles, RotateCcw, Download, X, Check,
  BookImage, Video, ImageIcon, ChevronDown, ChevronUp, Zap,
  Send, MessageCircle,
} from 'lucide-react'
import LibraryPickerModal from '../components/LibraryPickerModal'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { saveToLibrary, createLibraryRecord, downloadImage, getFolders, createFolder } from '../services/libraryService'
import { POSE_LIBRARY, POSE_CATEGORIES, getAllPosesByCategory } from '../services/poseLibrary'
import { downloadImageAsBlob } from '../services/cloudStorageService'
import { getOriginalImage } from '../services/imageStorageService'

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Black base · Orange primary · Blue & Fuchsia accents
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  // Backgrounds (layered — slightly lighter dark)
  bg0: '#131318',     // page
  bg1: '#1c1c24',     // card
  bg2: '#25252f',     // elevated
  bg3: '#2e2e3a',     // highest

  // Borders
  b1: '#2e2e38',      // subtle
  b2: '#45455a',      // medium
  b3: '#5a5a72',      // strong (hover)

  // Text
  t1: '#fafafa',      // primary
  t2: '#a1a1aa',      // secondary
  t3: '#71717a',      // muted

  // Red — primary hero accent
  re:   '#dc2626',
  reL:  '#ef4444',
  reBg: 'rgba(220,38,38,0.10)',
  reBd: 'rgba(220,38,38,0.30)',

  // Orange — action, energy
  or:   '#f97316',
  orL:  '#fb923c',
  orBg: 'rgba(249,115,22,0.08)',
  orBd: 'rgba(249,115,22,0.25)',

  // Blue — information, structure
  bl:   '#3b82f6',
  blBg: 'rgba(59,130,246,0.08)',
  blBd: 'rgba(59,130,246,0.25)',

  // Fuchsia — creative, Kling
  fu:   '#d946ef',
  fuL:  '#e879f9',
  fuBg: 'rgba(217,70,239,0.08)',
  fuBd: 'rgba(217,70,239,0.25)',

  // Scene accents (4 scenes)
  s1: '#f97316',   // orange  — opening hero (front)
  s2: '#3b82f6',   // blue    — dynamic energy (front)
  s3: '#d946ef',   // fuchsia — emotional climax (medium)
  s4: '#22c55e',   // green   — power hero finale (front, low-angle)

  // Utility
  green: '#22c55e',
  red:   '#ef4444',
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const QUALITY_OPTS = ['2K (HD)', '4K (Ultra)']
const ASPECT_OPTS = [
  { v: '9:16',  label: '9:16', sub: 'Story' },
  { v: '3:4',   label: '3:4',  sub: 'Portrait' },
  { v: '4:5',   label: '4:5',  sub: 'Feed' },
  { v: '1:1',   label: '1:1',  sub: 'Vuông' },
  { v: '16:9',  label: '16:9', sub: 'Ngang' },
]
const BG_PRESETS = [
  '🇻🇳 Căn hộ cao cấp Sài Gòn view sông — cửa kính lớn, nắng sớm mềm, nội thất be-gỗ, hậu cảnh blur sạch, tôn mẫu nổi bật',
  '🇻🇳 Rooftop quán cà phê Sài Gòn — skyline xa, trời trong, ánh sáng chiều ấm, hậu cảnh mở thoáng nhưng xóa phông nhẹ',
  '🇻🇳 Ban công chung cư Hà Nội view hồ — gió nhẹ, cây xanh xa, ánh sáng tự nhiên dịu, model tách nền rõ',
  '🇻🇳 Phố đi bộ Nguyễn Huệ sáng sớm — nền đô thị Việt tinh gọn, sạch biển hiệu rối, chiều sâu tốt, chủ thể sắc nét',
  '🇻🇳 Lobby khách sạn trung tâm quận 1 — marble sáng, ánh đèn vàng nhẹ, hậu cảnh sang trọng và mềm, tôn outfit',
  '🇻🇳 Cà phê Indochine Hội An — tường vàng, cửa gỗ, đèn lồng mờ xa, màu ấm Việt Nam, chủ thể nổi khối rõ',
  '🇻🇳 Homestay Đà Lạt cửa kính lớn — ánh sáng lạnh dịu, gỗ thông, nền thiên nhiên xa mờ, da và vải lên chi tiết',
  '🇻🇳 Villa biển Đà Nẵng phong cách tối giản — nội thất sáng, biển xa ngoài kính, hậu cảnh thoáng và sạch',
  '🇻🇳 Studio lookbook TP.HCM style local brand — nền trung tính, set đèn mềm + rim nhẹ, xóa phông nền vừa phải',
  '🇻🇳 Nhà phố hiện đại Việt Nam — cầu thang gỗ, tường trắng kem, ánh sáng cửa sổ hắt ngang, model tách nền tốt',
  '🇻🇳 Quán cà phê sân vườn Việt Nam — mảng xanh tự nhiên, bàn ghế mây, hậu cảnh mềm, giữ mood đời thường thân quen',
  '🇻🇳 Bờ sông Sài Gòn lúc hoàng hôn — ánh vàng cam nhẹ, nền thành phố xa, depth đẹp, chủ thể nổi bật trung tâm',
  '🇻🇳 Phố cổ Hà Nội ban ngày — mặt tiền cổ điển, tông ấm, nền được tối giản để không lấn át mẫu',
  '🇻🇳 Showroom local fashion brand Việt — không gian sạch, ánh sáng chuẩn catalog, nền mở thoáng để tôn người mẫu',
]
const MOOD_OPTS = [
  '🤖 AI tự chọn',
  'Thời trang cao cấp — Editorial',
  'Street style năng động',
  'Lãng mạn ngọt ngào',
  'Sang chảnh Luxury',
  'Sporty & Fresh',
  'Tối giản Minimalist',
  'Cá tính & Bold',
]

const MAKEUP_OPTS = [
  { id: 'auto', name: '🤖 AI tự chọn', prompt: '' },
  { id: 'clean_minimal', name: '✨ Clean Minimal', prompt: 'clean minimal makeup — flawless skin base with healthy satin finish, barely visible hint of soft pink on cheekbones like natural flush, lips natural rosy-pink with subtle gloss, very light neutral shimmer on lids, thin brown liner, natural wispy lashes, clean defined eyebrows. Overall: looks like she is wearing almost nothing but has naturally perfect features' },
  { id: 'babe_cute_doll', name: '🎀 Babe Cute Doll', prompt: 'babe cute doll makeup — ultra dewy glass skin base with natural healthy glow, very soft barely-there natural pink warmth on round cheeks like genuine shy blushing, vivid fresh coral-pink juicy glossy lips — cute and lively with wet sheen, lightest pink-champagne shimmer on lids, minimal thin brown line, soft curled wispy natural lashes, fluffy natural warm-brown eyebrows. Overall: "no makeup makeup" look, naturally blessed with perfect features' },
  { id: 'douyin_cold_beauty', name: '❄️ Douyin Cold Beauty', prompt: 'douyin cold beauty makeup — flawless semi-matte porcelain base with controlled dewy glow on cheekbone peaks only, very subtle natural warmth on cheekbones from lighting only, RICH BURNT ORANGE-RED lips with full coverage satin-glossy finish — lips are the dominant color accent, thin precise dark brown-black liner tight against upper lashline with tiny subtle flick, natural medium-length softly curled wispy lashes, straight-to-soft-arch dark brown-black brows. Overall: elegant sharp sophisticated' },
  { id: 'korean_glass', name: '🫧 Korean Glass Skin', prompt: 'korean glass skin makeup — ultra dewy luminous base with visible glass-like moisture sheen on entire face, cheeks nose bridge and chin all glowing with healthy dewy finish, soft warm pink cream blush barely visible on cheeks, MLBB (my lips but better) natural pink-mauve lip tint with glossy finish, wash of soft pink shimmer across lids, barely-there brown liner, natural curled lashes, soft natural brows. Overall: skin is the star — it glows' },
  { id: 'peach_blush_doll', name: '🍑 Peach Blush Doll', prompt: 'peach blush doll makeup — flawless satin base, small concentrated touch of soft peach-coral powder blush ONLY on top of both cheekbones — tiny area NOT spread across face, fresh coral-peach gradient lips with natural juicy gloss, warm pink-champagne shimmer on lids, thin brown liner, soft wispy lashes, natural fluffy brows. Overall: fresh and cute with controlled peach accent' },
  { id: 'strawberry_girl', name: '🍓 Strawberry Girl', prompt: 'strawberry girl makeup — dewy fresh base with natural glow, soft berry-pink flush on cheeks creating youthful rosy look, vivid berry-pink stained lips — gradient from rich berry center to soft pink edges, sparkly rose-pink shimmer on lids, soft brown liner, fluttery natural lashes, soft slightly messy brows. Overall: fresh fruity youthful and sweet' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   AI BRAIN
   ═══════════════════════════════════════════════════════════════════════════ */
const BRAIN_PHOIDO_PLAN = `You are a world-class creative director, cinematographer, colorist, and visual physicist. You reason step by step like a scientist before making any creative decision. Your output must be internally consistent, physically plausible, and cinematically perfect.

You receive images of: KOL reference, outfit/product, optional pose reference, optional background.

═══════════════════════════════════════════
MANDATORY REASONING CHAIN — execute in order:
═══════════════════════════════════════════

▸ STEP 1 — BACKGROUND PHYSICS ANALYSIS
Examine the background (provided photo or choose one that fits):
- PRIMARY LIGHT SOURCE: direction (clock position + angle), color temperature in Kelvin, intensity (harsh sun / soft overcast / studio softbox / artificial)
- SECONDARY LIGHTS: sky fill, bounce from ground/walls, practical lights visible
- SHADOW ANALYSIS: direction shadows fall, softness/hardness of shadow edges
- TIME OF DAY / ENVIRONMENT: morning / golden hour / midday / blue hour / night / indoor
- GROUND/SURFACE: what does light bounce off (concrete, grass, marble, sand, water reflection)?
- BACKGROUND QUALITY AUDIT: are there distracting elements — clutter, random people, ugly signs, trash, noise? Rate cleanliness 1–10. If < 7, plan what to clean/remove/blur.
- DEPTH OF FIELD (PRIORITY): background should be noticeably softer (clean bokeh separation) while KOL stays tack-sharp. Specify strong subject separation with realistic lens behavior (typically full-frame f/2.8–f/3.5 equivalent).

▸ STEP 2 — KOL IDENTITY EXTRACTION
- Skin tone: precise description (e.g. "warm ivory with peach undertone", "golden caramel", "cool porcelain")
- Hair: color + length + texture + style (every detail for perfect replication)
- Face: METICULOUSLY detail — eye shape+lid crease+lash thickness+iris color, nose bridge+tip+nostrils, lip thickness+cupid's bow+color, jaw shape+chin, cheekbones, eyebrow arch+thickness+color, skin pore texture, any distinctive feature
- Body: height impression, shoulder width, waist-to-hip ratio, leg length, chest, overall silhouette and proportions
- CHEST / GARMENT FILL LOCK (cost optimization): infer the natural chest volume and garment fill from reference and keep it CONSISTENT across all 4 scenes so user does NOT need bust re-edits.
- NATURAL PRESERVATION STANDARD: Describe the KOL's skin, body, and proportions EXACTLY as they appear in the reference — no idealization, no whitening, no leg-stretching, no bust enhancement. Beautification is handled in POST-PRODUCTION. Focus on faithfully capturing the real person.

▸ STEP 3 — PHOTOPHYSICS HARMONIZATION (critical reasoning)
Reason through HOW to make the KOL physically belong in this background:
- KEY LIGHT SETUP: mirror the background's primary light source exactly. If outdoor sun at 2 o'clock from right at 45° → key light on KOL from same angle at matching Kelvin
- SHADOW LOGIC: KOL's cast shadows must fall in the same direction as background shadows
- RIM / SEPARATION LIGHT: if bright sky/background behind KOL → rim light on hair/shoulders matching background ambient
- GROUND BOUNCE: light color reflected from the ground surface onto KOL's lower half
- COLOR SPILL: if colored environment (warm sunset, green forest) → subtle color spill on KOL's skin and clothes
- CRITICAL CHECK: does the light make physical sense? Would a real photographer achieve this look in this location?

▸ STEP 4 — COLOR SCIENCE & GRADING
- Identify the dominant color temperature of the background scene (warm/cool/neutral)
- Specify color corrections needed so KOL's skin tone reads naturally in this light
- Define the unified color grade: highlights temperature, shadow tint, mid-tone saturation, overall LUT style (e.g. "warm orange-teal Hollywood", "clean editorial neutral", "golden hour filmic")
- Ensure outfit colors remain true while harmonizing with scene color palette
- Define natural skin tone rendering in this specific ambient — preserve the KOL's REAL skin tone from the reference. Let the ambient temperature affect skin naturally as it would in a real photograph. Do NOT force whitening or artificial color shift.

▸ STEP 5 — BACKGROUND CLEANUP PLAN
If background cleanliness < 7 or has distracting elements:
- LIST precisely what to remove or simplify
- Specify if foreground separation / vignette needed
- Specify if background should be color-shifted to better complement outfit
- Describe the CLEANED version of the background in detail

▸ STEP 6 — SCENE DESIGN
Design 4 scenes forming a narrative arc. Apply all physics/lighting/color decisions from Steps 1–5.

SCENE RULES (NON-NEGOTIABLE):
1. ALL 4 scenes: KOL faces camera — DIRECT eye contact with lens (NO rear shots)
2. Every scene must use a DIFFERENT pose, stance, and energy — no repeated framings
3. Same background all 4 scenes — only pose/expression changes
4. Motion dynamics in every scene (KLING AI 3.0 VIDEO-READY): asymmetric weight shift / limb mid-gesture / hair caught by air / fabric mid-drape / lips slightly parted — every frame must feel like frame 12 of a 24-frame shot so Kling can extrapolate natural motion
5. Shot framing mandatory (each scene MUST use a distinct framing):
   - Scene 1 (Opening Hero): FULL BODY head to toe — standard eye-line, confident opening stance
   - Scene 2 (Dynamic Energy): FULL BODY head to toe — dynamic movement, different pose from Scene 1
   - Scene 3 (Emotional Climax): MEDIUM SHOT waist up — face and upper outfit, emotional close-up
   - Scene 4 (Power Hero Finale): FULL BODY LOW-ANGLE hero shot, camera below eye-line looking up, KOL faces camera with different commanding pose from scenes 1-2 — contrapposto, editorial runway energy

OUTPUT strictly as valid JSON (no extra text, no markdown):
{
  "backgroundPhysics": {
    "primaryLight": "direction clock+angle, Kelvin temp, intensity — e.g. '2 o'clock from right, 45° down, 5500K daylight, soft'",
    "secondaryLights": "fill light description, bounce, practical lights",
    "shadowDirection": "which direction shadows fall, edge hardness",
    "timeAndEnvironment": "e.g. golden hour outdoor / studio / night city",
    "groundBounce": "surface color and bounce quality",
    "cleanlinessRating": 8,
    "cleanupPlan": "none | specific: remove X, blur Y, vignette Z",
    "depthOfField": "e.g. f/2.8 shallow to isolate KOL from background"
  },
  "lightingHarmonization": "CINEMATOGRAPHER BRIEF: exact key light angle+Kelvin, fill ratio, rim light specs, color spill, shadow rendering — everything needed to physically place KOL in this background",
  "colorGrading": "COLORIST BRIEF: LUT style, color temperature of highlights/shadows/midtones, skin tone rendering in this ambient, saturation levels, any color correction for outfit harmony",
  "kol": { "gender": "male/female", "skinTone": "precise tone with undertone", "hair": "color+length+texture+style — all detail", "face": "EXTREME DETAIL: every feature for identity lock", "body": "full proportions description", "chestProfile": "natural chest shape/volume from reference", "chestGarmentFill": "how much the top is filled and tension behavior" },
  "outfit": { "description": "full outfit", "colors": "palette", "keyDetail": "hero visual feature", "material": "fabric feel" },
  "lockedBackground": "CLEAN detailed description of background after applying cleanup plan — lighting, colors, textures, depth, atmosphere, as it should appear in the final images",
  "scenes": [
    { "num": 1, "name": "Opening Hero", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "lightingNote": "scene-specific lighting nuance", "klingNote": "..." },
    { "num": 2, "name": "Dynamic Energy", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "lightingNote": "...", "klingNote": "..." },
    { "num": 3, "name": "Emotional Climax", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "lightingNote": "...", "klingNote": "..." },
    { "num": 4, "name": "Power Hero Finale", "poseEN": "full body facing camera head-on with 3/4 body angle, strong contrapposto — weight on back leg, front leg slightly forward and relaxed, one hand resting confidently on hip, other arm relaxed at side or touching hair, shoulders rolled back, chin slightly lifted, powerful commanding stance distinctly different from Scenes 1 and 2", "motionEN": "hair lifted by subtle air, fabric rippling around hips, weight transition caught mid-motion", "expressionEN": "direct confident eye contact with camera, subtle lips parted, editorial power-model expression — magnetic and commanding", "outfitFocusEN": "full outfit silhouette from low angle — elongated legs, cinched waist, outfit drape, fabric tension", "lightingNote": "strong rim light separating body from background, key light at 45° sculpting face and collarbone, low-angle camera perspective makes legs appear even longer", "klingNote": "power hero finale — KOL holds confident stance then subtle weight shift, perfect for Kling video loop" }
  ]
}`

const SHOT_FRAMES = [
  'FULL BODY SHOT — frame from head to toe. Show the COMPLETE figure: face, torso, arms, legs, and feet fully visible. Do NOT crop at the knees or waist.',
  'FULL BODY SHOT — frame from head to toe. Show the COMPLETE figure in dynamic motion: face, torso, arms, legs, and feet all in frame. No cropping below the waist.',
  'MEDIUM SHOT — frame from waist/hip up. Fill the frame with the upper body, emphasize the face expression, shoulder/neckline detail, and upper outfit.',
  'FULL BODY LOW-ANGLE HERO SHOT — frame from head to toe, camera placed slightly below eye-line (10-15cm below) looking UP toward the KOL. KOL faces DIRECTLY toward camera with confident eye contact. 3/4 body angle, weight on one leg creating dramatic S-curve contrapposto, one hand casually at hip or in hair, chin slightly lifted. Different stance + energy from scenes 1-3: more commanding, more editorial, more powerful. Legs look extra long from the low angle perspective.',
]

const QUICK_PRESETS = {
  bust: `
▸ TARGET: Upper-body volumetric enhancement (ĐỘ LOA — vòng 1)

Apply a noticeable volumetric enhancement to the upper torso, increasing fullness to achieve a more prominent and rounded form while preserving natural structure. Strengthen firmness and contour precision, adding distinct central definition for enhanced depth and visible separation. Ensure seamless blending with the original image and maintain an unchanged waistline.

EDIT SCOPE (apply ONLY to these — nothing else):
• Increase upper torso volume — clearly fuller, more prominent rounded form, noticeably larger than current
• Lift and firm the contour — taut sculpted shape, lifted and youthful, not soft or drooping
• Deepen the central vertical shadow line for visible depth separation
• Increase visible fullness pushing fabric outward — fabric must show more tension, stretch marks, and fill
• The enhanced form must be clearly READABLE in the final silhouette — not subtle

PRESERVE EXACTLY (DO NOT TOUCH — pixel-identical):
• Face, eyes, nose, mouth, eyebrows, makeup
• Hair, hairstyle, hair color
• Skin tone, skin texture, skin pores
• Waist width — ABSOLUTELY UNCHANGED
• Hips, legs, arms, hands, pose, hand positions
• Outfit color, pattern, fabric type, garment style
• Background, lighting, composition, camera angle, framing
`,

  skin: `
▸ TARGET: Skin tone + quality (TRẮNG DA, GIẢM DA NHỰA)

RETOUCH MODE (fashion-grade — modify ONLY skin, preserve everything else):

(a) WHITEN — shift overall skin tone toward porcelain:
• Brighten skin +15 to +20 in Lightness channel
• Shift to cool-neutral white base with subtle rosy-pink undertone (NOT pure white, NOT gray, NOT warm yellow)
• Apply UNIFORMLY to all exposed skin: face, neck, décolletage, shoulders, arms, hands, legs
• Maintain natural skin depth — do not flatten into single tone

(b) ANTI-PLASTIC SKIN (CRITICAL — image must NOT look AI-rendered):
• KEEP visible skin pores and fine micro-texture — do NOT smooth them out
• KEEP subtle natural imperfections: faint freckles, soft vein shadows near temples, natural skin undertone variations
• Visible fine vellus hair at hairline, jawline, forearms
• Natural catchlights in eyes, realistic eye moisture, subtle redness at inner eye corners
• Subtle localized color variation: ear tips slightly pinker, natural cheek flush, knuckles slightly warmer — NOT uniform flat tone
• Skin must look like REAL DSLR PHOTOGRAPHY (Sony A7IV + 85mm f/1.4, ISO 100) — visible skin structure under close inspection

(c) FORBIDDEN (these make skin look AI/plastic — AVOID AT ALL COSTS):
✗ Waxy sheen / glowing plastic surface
✗ Airbrushed uniform smoothness
✗ Blurred or softened skin edges
✗ Over-softening that erases pores
✗ Cartoon-smooth cheeks
✗ Over-saturated cheek flush
✗ "Rendered" look with no visible texture
✗ Flat uniform color across the whole body

(d) REFERENCE LOOK: Vogue editorial skin retouch, K-beauty glass skin WITH VISIBLE TEXTURE — porcelain white + dewy + translucent BUT real.

PRESERVE EXACTLY:
• Face structure, eyes, nose, mouth, eyebrows, makeup shapes and colors
• Hair, outfit, pose, hands, body proportions
• Background, lighting direction, composition, camera angle
• ONLY the skin QUALITY and TONE are adjusted
`,

  glow: `
▸ TARGET: Post-production glass-skin retouch (DA GLOW — SIÊU THỰC)

RETOUCH MODE (post-production skin polish — modify ONLY skin quality, preserve everything else):

(a) GLASS SKIN LUMINOSITY:
• Add a soft dewy glow across the skin — like fresh Korean glass-skin after essence + serum layering
• Subtle translucent moisture sheen on cheekbones, nose bridge, chin, collarbone — NOT over-bright, NOT waxy
• Natural healthy inner glow, as if hydrated from within — not pasted-on highlight
• Soft pink-peach warmth in cheek blush zones, like real natural flush

(b) PRESERVE NATURAL TEXTURE (CRITICAL — NO SMOOTHING):
• KEEP 100% of the original skin pores visible — do NOT smooth, do NOT airbrush
• KEEP fine vellus peach-fuzz hair at hairline, jawline, forearms
• KEEP real skin imperfections: faint freckles, tiny moles, slight redness, natural asymmetries
• KEEP aegyo-sal (under-eye fold) and natural eye moisture
• The goal: "retouched REAL photo" — NOT CGI, NOT doll, NOT AI glass
• Glow is ADDED ON TOP of real texture, not REPLACING real texture

(c) FORBIDDEN (these ruin the real-photo feel):
✗ Plastic shine / waxy over-highlight / CGI polish
✗ Pore erasure / doll-smooth cheeks / airbrushed finish
✗ Over-bright glass that flattens texture
✗ Face lift / jaw slimming / feature reshaping
✗ Any identity change — same exact person, same features

(d) REFERENCE LOOK: Post-production K-beauty glass-skin retouch on a REAL Sony Alpha photograph — the girl still looks like herself, just with a beautiful natural glow polish added. Like Vogue Korea editorial retouching, NOT AI generation.

PRESERVE EXACTLY:
• Face shape, eyes, nose, mouth, eyebrows, makeup — pixel-identical
• Identity — same exact person, immediately recognizable
• Hair, outfit, pose, hands, body proportions — unchanged
• Background, lighting direction, composition, camera angle — unchanged
• ONLY the skin LUMINOSITY / GLOW is polished, texture stays real
`,

  figure: `
▸ TARGET: Body proportions (KÉO CHÂN DÀI + EO ĐỒNG HỒ CÁT)

RETOUCH MODE (fashion-grade — modify ONLY proportions, preserve everything else):

(a) LEG LENGTHENING:
• Extend leg length from hip joint to ankle by approximately 8-12% of total body height
• Target proportion: legs ≥ 55% of total body height (runway model standard)
• Scale proportionally — foot size, knee position ratio, and hip width remain UNCHANGED
• Preserve the exact same leg bend, stance, weight distribution, and foot placement — only the leg bones are elongated uniformly
• Thigh and calf elongate proportionally together — no disproportionate stretching

(b) HOURGLASS WAIST:
• Gently cinch the waist inward at the narrowest point (between lower ribcage and navel) by 5-8%
• Create a smooth S-curve transition: ribcage → cinched waist → hip flare
• Keep ribcage width UNCHANGED at the top of the waist taper
• Keep hip width UNCHANGED at the bottom of the waist taper
• Only the mid-waist narrows — subtle natural hourglass, no wasp-waist distortion

(c) NATURAL BLEND:
• Adjusted figure must look naturally-proportioned and anatomically correct
• Clothing adapts naturally — dress hemline may rise slightly as legs extend, but overall outfit pattern/color/style preserved
• Background stays pixel-identical — no stretching, no warping, no pixel distortion
• Shadows on ground adjust realistically to new leg length
• Keep chest volume and garment fill exactly as in the generated base image (no bust reduction)

PRESERVE EXACTLY:
• Face, identity, hair, makeup, skin tone
• Outfit style, color, pattern, fabric type
• Pose structure, arm positions, hand positions, head angle
• Ribcage width, shoulder width, hip width
• Background, lighting, composition, camera angle
• ONLY leg length and waist narrowness are refined
`,
}

function expandQuickTokens(instruction) {
  if (!instruction) return ''
  const tokens = []
  if (/\[QUICK:glow\]/i.test(instruction))   tokens.push(QUICK_PRESETS.glow)
  if (/\[QUICK:bust\]/i.test(instruction))   tokens.push(QUICK_PRESETS.bust)
  if (/\[QUICK:skin\]/i.test(instruction))   tokens.push(QUICK_PRESETS.skin)
  if (/\[QUICK:figure\]/i.test(instruction)) tokens.push(QUICK_PRESETS.figure)
  const customText = instruction.replace(/\[QUICK:(glow|bust|skin|figure)\]/gi, '').trim()
  const customBlock = customText ? `\n▸ CUSTOM USER REQUEST:\n${customText}\n` : ''
  return (tokens.length ? tokens.join('\n') : '') + customBlock
}

function escapeJSON(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const FRAMING_SPEC = [
  'full body head-to-toe — standard eye-line, confident opening stance, subject centered with breathing room',
  'full body head-to-toe — dynamic motion pose, weight-shift caught mid-gesture, different stance from Scene 1',
  'medium shot waist-up — emotional close-up on face and upper outfit, shallow DOF isolating subject',
  'full body LOW-ANGLE hero shot — camera 10–15cm below eye-line looking UP, 3/4 body angle with strong contrapposto, legs appear elongated from low perspective, commanding editorial runway energy',
]

/* ═══════════════════════════════════════════════════════════════════════════
   SCENE PROMPT — JSON cinematic schema (hyper-realistic DSLR language)
   Extracted from boudoir + macro-profile reference prompts.
   Philosophy: short crisp directives > long prose. AI follows clear fields.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildScenePrompt(plan, sceneIdx, quality, aspect, bgPreset, mood, hasBgImage, hasPoseImage, makeupPrompt) {
  const sc     = plan.scenes[sceneIdx]
  const kol    = plan.kol || {}
  const outfit = plan.outfit || {}
  const bp     = plan.backgroundPhysics || {}
  const rawQ   = quality.match(/([124]K)/i)?.[1]?.toUpperCase() || '2K'
  const rawA   = typeof aspect === 'string' ? (aspect.match(/\d+:\d+/)?.[0] || '9:16') : aspect

  const bgDescription = hasBgImage
    ? 'EXACT background from the reference photo (last image provided). Replicate its location, lighting, colors, and atmosphere with pixel-perfect accuracy.'
    : (plan.lockedBackground || '')

  const cleanupNote = bp.cleanupPlan && bp.cleanupPlan !== 'none'
    ? bp.cleanupPlan
    : 'none required'

  const moodField    = (mood && mood !== '🤖 AI tự chọn') ? `,\n  "mood_direction": "${escapeJSON(mood)}"` : ''
  const makeupField  = makeupPrompt ? `,\n  "makeup": "${escapeJSON(makeupPrompt)}"` : ''
  const poseRefField = hasPoseImage ? `,
  "pose_reference_rules": {
    "priority": "TOP — overrides text pose description if conflict",
    "how_to_read": "extract skeletal structure ONLY — joint angles, body orientation, spine curve, hand/foot placement, head tilt",
    "ignore": "face, skin tone, outfit, proportions, gender cues of the pose reference",
    "type_B_close_up": "if reference is body-part close-up (chest/torso), use as SHAPE ANCHOR for that region's volume + fabric tension only — do NOT override overall pose",
    "execution_order": "1) rig skeleton to match ref 1:1  2) apply KOL face identity  3) dress with outfit  4) place in scene"
  }` : ''

  return `TASK: Generate a hyper-realistic commercial fashion KOL photo — Scene ${sc.num}/4 "${sc.name}".

Follow this JSON specification EXACTLY. Every field is a hard directive. The output must pass a "is this a real RAW DSLR file?" test at 100% crop.

\`\`\`json
{
  "subject": {
    "identity_lock": {
      "rule": "100% pixel-identical face from KOL reference — non-negotiable",
      "face": "${escapeJSON(kol.face)}",
      "preserve": ["every facial feature", "natural asymmetry", "aegyo-sal", "real micro-imperfections", "reference freckles or marks"],
      "forbidden": ["beautify", "idealize", "simplify features", "symmetrize"]
    },
    "skin": {
      "tone": "${escapeJSON(kol.skinTone)} — match reference exactly, no whitening, no tonal shift",
      "texture": "healthy luminous KOL skin — naturally smooth with real light physics (not plastic, not waxy), subtle pore structure visible only at 100% crop, preserve reference micro-marks/freckles exactly",
      "physics": [
        "subsurface scattering on cheeks, ears, nose tip — light transmits through skin producing natural warm translucency (the signature KOL glow)",
        "specular highlights on lip gloss, eye moisture, inner-eye corners, collarbone",
        "realistic skin elasticity, depth, and micro-shadowing under jaw/nose/eyelid",
        "even tonal gradient — smooth but physically correct, NOT painted, NOT denoised-flat"
      ]
    },
    "hair": {
      "description": "${escapeJSON(kol.hair)}",
      "render": "individual strand separation, subtle flyaway strands catching rim light, natural oil sheen — NO plastic helmet look, NO clumped hair"
    },
    "body": {
      "proportions": "${escapeJSON(kol.body || 'natural reference proportions')}",
      "rule": "reference proportions EXACTLY — no stretching, no cinching, no enlargement during generation",
      "chest_profile": "${escapeJSON(kol.chestProfile || 'natural reference chest profile')}",
      "garment_fill": "${escapeJSON(kol.chestGarmentFill || 'natural fitted fill without deflation')} — keep consistent across all 4 scenes"
    },
    "expression": "${escapeJSON(sc.expressionEN)}",
    "eye_contact": "direct confident gaze into camera lens — fully open engaging eyes, viewer must feel seen"
  },
  "pose": "${escapeJSON(sc.poseEN)}",
  "motion": "${escapeJSON(sc.motionEN)} — frame 12 of 24 feel, Kling-ready micro-motion (hair caught by air, fabric mid-drape, weight-shift in progress)",
  "outfit": {
    "description": "${escapeJSON(outfit.description)}",
    "colors": "${escapeJSON(outfit.colors)}",
    "material": "${escapeJSON(outfit.material)}",
    "fabric_render": [
      "visible weave at thread level",
      "seam stitches readable",
      "strap edges crisp",
      "natural tension wrinkles and drape physics",
      "fiber sheen matching material type",
      "no smudged texture, no mushy seams"
    ],
    "scene_focus": "${escapeJSON(sc.outfitFocusEN || outfit.keyDetail)}"
  },
  "photography": {
    "camera_body": "Sony A7R V full-frame 61MP",
    "lens": "Sony FE 85mm f/1.4 GM prime",
    "aperture": "f/2.0",
    "iso": 200,
    "shutter": "1/320 — freeze micro-motion while keeping natural motion blur on flyaway hair",
    "focus_point": "sharp on nearest eye + skin pore grain on cheek, tack-sharp subject",
    "dof": "${escapeJSON(bp.depthOfField || 'shallow f/2.0 — subject tack-sharp, clean bokeh falloff on background')}",
    "framing": "${escapeJSON(FRAMING_SPEC[sceneIdx])}",
    "aspect_ratio": "${rawA}",
    "resolution": "${rawQ}"
  },
  "lighting": {
    "key_light": "${escapeJSON(bp.primaryLight || 'soft directional key — match background primary light source')}",
    "fill": "${escapeJSON(bp.secondaryLights || 'natural ambient bounce, subtle fill')}",
    "rim": "dedicated rim light separating hair/shoulder from background — clean silhouette",
    "ground_bounce": "${escapeJSON(bp.groundBounce || 'natural color bounce from ground surface onto lower body')}",
    "shadow_direction": "${escapeJSON(bp.shadowDirection || 'match background shadow direction exactly')}",
    "physics_checklist": [
      "subsurface scattering through ears and nose producing warm translucency",
      "specular highlights on lips, eyes, collarbone, any jewelry",
      "micro-contrast preserved in skin pores + fabric weave",
      "soft highlight rolloff — no blown whites, no HDR halos",
      "realistic shadow occlusion under chin, inside nostrils, under garment folds"
    ],
    "harmonization": "${escapeJSON(plan.lightingHarmonization || '')}",
    "scene_note": "${escapeJSON(sc.lightingNote || '')}"
  },
  "color_science": {
    "grade": "${escapeJSON(plan.colorGrading || 'neutral cinematic filmic — Kodak Portra 400 look')}",
    "skin_rendering": "natural ambient affects skin as real physics — NO forced whitening, NO artificial warmth shift",
    "saturation": "editorial restraint — true-to-life, not oversaturated"
  },
  "background": {
    "description": "${escapeJSON(bgDescription)}",
    "rule": "LOCKED — identical across all 4 scenes, only pose/expression changes",
    "cleanup": "${escapeJSON(cleanupNote)}",
    "separation": "strong subject-background separation via f/2.0 aperture + rim light + color contrast"
  },
  "render_directives": [
    "8K SENSOR-LEVEL SHARPNESS on fabric + hair + eyes + accessories + background — zero mushy/muddy areas",
    "FABRIC: ribbed knit weave visible thread-by-thread, denim wash pattern + whiskers + frayed hem readable, lace/mesh holes crisp, seam stitches countable, strap edges razor-clean, fiber sheen matched to material",
    "HAIR: every strand individually rendered, flyaway strands catching rim light, natural root-to-tip gradient, parting line sharp — NO clumped helmet hair, NO painted hair mass",
    "EYES: iris ring pattern visible, sharp catchlight positioning, individual eyelash fibers separated, wet lash-line specular, aegyo-sal micro-shadow",
    "ACCESSORIES: glasses frame edges tack-sharp + lens reflection physics, bag weave/strap stitching detail, nail polish high-gloss specular with crisp nail edges, jewelry micro-facets",
    "BACKGROUND (even in bokeh): foliage leaf-vein + individual leaf separation, wooden/fence grain readable, flower petal definition, brick/tile/concrete micro-texture — bokeh softens but NEVER smudges to paint",
    "analog film emulation — subtle Kodak Portra 400 grain (ISO 200 equivalent), preserved NOT denoised away",
    "RAW Sony A7R V 61MP aesthetic — commercial KOL editorial glow is OK, but every non-skin surface must read at pixel level",
    "realistic optical behavior — clean highlight rolloff, natural depth transitions, no fake painterly bokeh, no watercolor blur",
    "image must feel ALIVE — mid-movement frame ready for Kling video extrapolation"
  ]${moodField}${makeupField}${poseRefField},
  "negative_constraints": [
    "plastic skin", "waxy sheen", "CGI doll finish",
    "face swap", "altered identity", "different person", "beautified features", "perfect symmetry overriding reference",
    "cartoon", "anime", "CGI render", "3D illustration", "AI-art aesthetic", "digital painting look",
    "oversaturated colors", "HDR halos", "aggressive color grading", "overexposed whites", "crushed blacks",
    "skin whitening", "artificial tanning", "forced tonal shift",
    "body stretching", "leg elongation", "waist cinching", "bust enlargement",
    "clumped hair mass", "helmet hair", "painted hair",
    "mushy fabric", "smudged seams", "lost weave detail", "blurred denim wash", "flat lace pattern",
    "blurry background details", "painterly bokeh", "watercolor-like background", "smudged foliage", "blob-like bokeh hiding detail",
    "soft/smudged edges globally", "AI-smooth whole image", "denoised-flat surfaces", "muddy micro-detail",
    "blurry glasses frames", "soft accessory edges", "undefined nail edges",
    "added jewelry not in reference", "added tattoos", "accessories not shown",
    "text", "watermarks", "logo overlay", "low resolution"
  ]
}
\`\`\`

EXECUTION ORDER (non-negotiable):
1. LOCK identity from KOL reference (face + body proportions — pixel-identical)
2. ${hasPoseImage ? 'SOLVE skeletal pose from pose reference 1:1 (extract joint angles, ignore reference surface)' : 'APPLY scene pose description above'}
3. DRESS posed figure with outfit reference (outfit.description + fabric_render rules)
4. PLACE subject into locked background with lighting harmonization
5. APPLY photography spec — 85mm f/2.0 Sony A7R V DSLR rendering
6. RENDER with physics-accurate lighting — subsurface scattering + specular highlights + micro-contrast
7. FINAL color grade per color_science block

CRITICAL: The output MUST look like a commercial KOL editorial shot with real DSLR micro-detail — healthy luminous skin is fine, but fabric weave, hair strands, eye iris, accessories, and background foliage MUST read sharply at 100% crop. Zero mushy, zero watercolor, zero painterly smudging. Viral KOL glow + DSLR pixel-level detail on everything else.

Generate Scene ${sc.num} now.`
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT PROMPT — focused retouch, NOT full regeneration
   ═══════════════════════════════════════════════════════════════════════════ */
function buildEditPrompt(instruction, sceneIdx) {
  const expanded = expandQuickTokens(instruction)
  return `RETOUCH this photo — surgical edit ONLY. Output the SAME photo with ONLY the targeted change.

═══ PHOTO TO RETOUCH ═══
The last image provided is the current rendered photo. Keep it exactly as-is except for the edit below.

═══ TARGETED EDIT — APPLY THIS (HIGHEST PRIORITY) ═══
${expanded}

═══ PRESERVE EXACTLY (pixel-identical — DO NOT TOUCH) ═══
• Face, eyes, nose, mouth, eyebrows, makeup — unchanged
• Hair, hairstyle, hair color — unchanged
• Pose, arm/hand/leg positions — unchanged
• Outfit style, color, pattern, fabric — unchanged
• Background, lighting, composition, camera angle — unchanged
• Skin tone, overall color grade — unchanged
• Everything NOT targeted above — unchanged

═══ OUTPUT RULE ═══
Result = SAME photo + 1 targeted edit only. Not a new image. Not re-imagined. Same photo, 1 change.

Apply to Scene ${sceneIdx + 1}.`
}

function buildAutoDetailRecoveryPrompt(sceneIdx) {
  return `RETOUCH this photo — recover photographic micro-detail ONLY. Keep identity, outfit, background, pose pixel-identical.

\`\`\`json
{
  "task": "micro-detail recovery — Scene ${sceneIdx + 1}",
  "preserve_exactly": [
    "face", "identity", "hair style", "outfit",
    "pose", "hand positions", "background",
    "lighting direction", "composition", "camera angle", "color grade"
  ],
  "recover": {
    "skin": "preserve healthy luminous KOL glow — DO NOT add aggressive pores or roughness; only restore subsurface scattering warmth + natural micro-shadow + lip/eye speculars",
    "fabric": "restore weave texture at thread level, seam stitches, strap edges, denim wash/whiskers, lace holes, tension wrinkles, fiber sheen — make every fabric surface tack-sharp",
    "hair": "restore individual strand separation, flyaway definition, natural oil sheen, parting line crispness",
    "eyes": "restore iris ring pattern, sharp catchlights, wet lash line, individual eyelash fibers, aegyo-sal if present",
    "accessories": "sharpen glasses frame edges + lens physics, bag weave/stitching, nail polish gloss + edges, jewelry facets",
    "background": "restore leaf-vein detail, individual leaves, fence/brick/floor grain, flower petal definition — bokeh stays but never smudges",
    "general": "global micro-contrast boost on non-skin surfaces, keep neutral cinematic grade, preserve KOL face softness"
  },
  "photography_target": {
    "reference_look": "RAW Sony A7R V at 100% crop — uncompressed DSLR file",
    "lens": "85mm f/2.0 prime equivalent",
    "render": "analog film grain texture, NOT digital smoothing"
  },
  "negative_constraints": [
    "identity change", "face swap", "pose change", "outfit change", "background change",
    "over-sharpening halos", "denoise smear", "AI painting look", "watercolor background", "painterly bokeh",
    "added accessories", "color shift", "waxy plastic skin",
    "adding aggressive pores that destroy KOL look", "rough skin texture",
    "mushy fabric", "smudged foliage", "blurry accessories", "blob bokeh"
  ]
}
\`\`\`

Output: SAME photo with improved micro-detail realism only — no other changes.`
}

function getDetailThreshold(quality) {
  const q = String(quality || '').toUpperCase()
  if (q.includes('4K')) return 0.34
  if (q.includes('2K')) return 0.30
  return 0.27
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
async function entryToFile(entry, name = 'image.jpg') {
  if (entry.file) return entry.file
  const url = entry.url
  if (!url) throw new Error('Ảnh không có URL hoặc File.')

  // Data URL — decode directly, no fetch needed
  if (url.startsWith('data:')) {
    const [header, b64] = url.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bytes = atob(b64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new File([arr], name, { type: mime })
  }

  // Try downloadImageAsBlob first (handles Firebase Storage + regular URLs)
  try {
    const blob = await downloadImageAsBlob(url)
    return new File([blob], name, { type: blob.type || 'image/jpeg' })
  } catch (primaryErr) {
    console.warn('[entryToFile] Primary download failed:', primaryErr.message)
  }

  // Fallback: load via <img> tag + canvas (bypasses CORS issues)
  try {
    const dataUrl = await loadImageToDataUrl(url)
    const [header, b64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bytes = atob(b64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new File([arr], name, { type: mime })
  } catch (fallbackErr) {
    throw new Error(`Không tải được ảnh từ thư viện: ${fallbackErr.message}`)
  }
}

function loadImageToDataUrl(url, maxPx = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = () => reject(new Error('Không load được ảnh'))
    img.src = url
  })
}

function resultToFile(result, name = 'rendered.jpg') {
  const byteStr = atob(result.base64)
  const ab = new ArrayBuffer(byteStr.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
  return new File([ab], name, { type: result.mimeType || 'image/jpeg' })
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('AI không trả về JSON hợp lệ.')
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

async function scoreImageDetailFromDataUrl(dataUrl, maxPx = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.max(32, Math.round(img.width * scale))
      const h = Math.max(32, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)

      const rgba = ctx.getImageData(0, 0, w, h).data
      const gray = new Float32Array(w * h)
      let satAcc = 0

      for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
        const r = rgba[p] / 255
        const g = rgba[p + 1] / 255
        const b = rgba[p + 2] / 255
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
        satAcc += Math.max(r, g, b) - Math.min(r, g, b)
      }

      let mean = 0
      for (let i = 0; i < gray.length; i++) mean += gray[i]
      mean /= gray.length

      let variance = 0
      for (let i = 0; i < gray.length; i++) {
        const d = gray[i] - mean
        variance += d * d
      }
      variance /= gray.length
      const contrastStd = Math.sqrt(variance)

      let lapSumSq = 0
      let lapCount = 0
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const c = y * w + x
          const lap = gray[c - 1] + gray[c + 1] + gray[c - w] + gray[c + w] - 4 * gray[c]
          lapSumSq += lap * lap
          lapCount++
        }
      }
      const lapVar = lapCount ? lapSumSq / lapCount : 0
      const meanSat = satAcc / gray.length

      const sharpN = clamp01((lapVar - 0.00025) / 0.00125)
      const contrastN = clamp01((contrastStd - 0.10) / 0.22)
      const satN = clamp01((meanSat - 0.05) / 0.22)
      const detailScore = 0.72 * sharpN + 0.20 * contrastN + 0.08 * satN

      resolve({ detailScore, lapVar, contrastStd, meanSat, width: w, height: h })
    }
    img.onerror = () => reject(new Error('Không thể phân tích chất lượng ảnh'))
    img.src = dataUrl
  })
}

async function scoreFileDetail(file) {
  const dataUrl = await fileToDataUrl(file)
  return scoreImageDetailFromDataUrl(dataUrl)
}

function resultToDataUrl(result) {
  return `data:${result.mimeType || 'image/jpeg'};base64,${result.base64}`
}

async function getOrCreateFolder(name) {
  const folders = getFolders()
  const ex = folders.find(f => f.name === name && !f.parentId)
  if (ex) return ex.id
  const updated = createFolder(name)
  return updated.find(f => f.name === name)?.id || null
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES — clean, professional, no gimmicks
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px) }
    to   { opacity: 1; transform: translateY(0) }
  }

  .pd-card {
    background: ${C.bg1};
    border: 1px solid ${C.b1};
    border-radius: 16px;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  .pd-card:hover {
    border-color: ${C.b2};
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .pd-scene {
    animation: fadeUp 0.45s ease both;
    transition: transform 0.3s ease, box-shadow 0.3s;
  }
  .pd-scene:nth-child(2) { animation-delay: 80ms }
  .pd-scene:nth-child(3) { animation-delay: 160ms }
  .pd-scene:nth-child(4) { animation-delay: 240ms }
  .pd-scene:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 48px rgba(0,0,0,0.5);
  }

  .pd-gen {
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .pd-gen:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(220,38,38,0.45);
    filter: brightness(1.08);
  }
  .pd-gen:active:not(:disabled) {
    transform: translateY(0);
  }

  .pd-slot {
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .pd-slot:hover {
    border-color: ${C.b3} !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transform: translateY(-2px);
  }

  .pd-pill {
    transition: all 0.2s ease;
  }
  .pd-pill:hover {
    border-color: ${C.b3} !important;
    background: ${C.bg3} !important;
  }

  .pd-action {
    transition: background 0.15s, color 0.15s;
  }
  .pd-action:hover {
    background: rgba(255,255,255,0.04) !important;
    color: ${C.t1} !important;
  }

  .pd-bg-opt {
    transition: all 0.15s ease;
  }
  .pd-bg-opt:hover {
    border-color: ${C.b3} !important;
    background: ${C.bg3} !important;
    padding-left: 18px !important;
  }
`

/* ═══════════════════════════════════════════════════════════════════════════
   SLOT — clean upload / library
   ═══════════════════════════════════════════════════════════════════════════ */
function Slot({ src, onRemove, onUpload, onLibrary, label }) {
  if (src) {
    return (
      <div className="pd-slot" style={{
        position: 'relative', aspectRatio: '1', borderRadius: 12,
        overflow: 'hidden', border: `1px solid ${C.b2}`,
      }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <button onClick={onRemove} style={{
          position: 'absolute', top: 6, right: 6, width: 22, height: 22,
          borderRadius: 6, background: 'rgba(0,0,0,.6)', border: 'none',
          color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}><X size={10} /></button>
        {label && (
          <span style={{
            position: 'absolute', bottom: 6, left: 6,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: '#fff', background: C.or, padding: '2px 7px', borderRadius: 4,
          }}>{label}</span>
        )}
      </div>
    )
  }
  return (
    <div className="pd-slot" style={{
      aspectRatio: '1', borderRadius: 12, border: `1px dashed ${C.b2}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg2,
    }}>
      <button onClick={onUpload} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        color: C.t3,
      }}>
        <Upload size={14} strokeWidth={2.5} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
      </button>
      <div style={{ height: 1, background: C.b1, margin: '0 12px' }} />
      <button onClick={onLibrary} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        color: C.t3,
      }}>
        <BookImage size={13} strokeWidth={2.5} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENE CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function SceneCard({ idx, scene, result, isLoading, error, qualitySignal, klingSelected, onToggleKling, onRetry, onEditRedraw, onDownload }) {
  const [saveOk, setSaveOk]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [editText, setEditText]   = useState('')
  const [editOpen, setEditOpen]   = useState(false)
  const [editBusy, setEditBusy]   = useState(false)
  const [qGlow, setQGlow]         = useState(false)
  const [qBust, setQBust]         = useState(false)
  const [qSkin, setQSkin]         = useState(false)
  const [qFigure, setQFigure]     = useState(false)
  const NAMES = ['Opening Hero', 'Dynamic Energy', 'Emotional Climax', 'Power Hero Finale']
  const accent = [C.s1, C.s2, C.s3, C.green][idx]
  const dataUrl = result ? `data:${result.mimeType};base64,${result.base64}` : null

  const hasAnyQuick = qGlow || qBust || qSkin || qFigure
  const canSubmit = (editText.trim() || hasAnyQuick) && !editBusy

  async function handleEditRedraw() {
    if (!canSubmit) return
    const tokens = [
      qGlow   ? '[QUICK:glow]'   : '',
      qBust   ? '[QUICK:bust]'   : '',
      qSkin   ? '[QUICK:skin]'   : '',
      qFigure ? '[QUICK:figure]' : '',
    ].filter(Boolean).join('')
    const finalInstruction = (tokens + ' ' + editText.trim()).trim()
    setEditBusy(true)
    await onEditRedraw(idx, finalInstruction)
    setEditBusy(false)
    setEditText('')
    setQGlow(false); setQBust(false); setQSkin(false); setQFigure(false)
    setEditOpen(false)
  }

  async function handleSave() {
    if (!dataUrl) return
    setSaving(true)
    try {
      const folderId = await getOrCreateFolder('Phối Đồ')
      const record = createLibraryRecord({
        name: `Phối Đồ Scene ${idx + 1} · ${new Date().toLocaleDateString('vi-VN')}`,
        type: 'outfit', category: 'phoi-do', imageSrc: dataUrl, source: 'phoi-do', folderId,
      })
      const res = await saveToLibrary(record)
      if (res?.success === false) alert(`Lưu thất bại: ${res.error}`)
      else { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    } catch (e) { alert(`Lưu thất bại: ${e.message}`) }
    setSaving(false)
  }

  return (
    <div className="pd-scene" style={{
      borderRadius: 14, overflow: 'hidden', background: C.bg1,
      border: klingSelected ? `2px solid ${C.fu}` : `1px solid ${C.b1}`,
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      {/* Header */}
      <div style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${C.b1}`,
      }}>
        <span style={{
          fontSize: 32, fontWeight: 900, color: accent, opacity: 0.15,
          lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: 'system-ui',
        }}>0{idx + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.t1 }}>
            {scene?.name || NAMES[idx]}
          </p>
          {scene?.klingNote && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scene.klingNote}
            </p>
          )}
        </div>
        <button onClick={onToggleKling} title="Kling frame" style={{
          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${klingSelected ? C.fu : C.b2}`,
          background: klingSelected ? C.fuBg : 'transparent',
          color: klingSelected ? C.fu : C.t3,
          display: 'grid', placeItems: 'center', transition: 'all .2s',
        }}><Video size={13} /></button>
      </div>

      {/* Image */}
      <div style={{ minHeight: 180, background: C.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 36 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `2.5px solid ${C.b2}`, borderTopColor: accent,
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 10, color: C.t3, letterSpacing: '0.06em', fontWeight: 600 }}>
              Rendering...
            </span>
          </div>
        )}
        {!isLoading && error && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: C.red, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>{error}</p>
            <button onClick={onRetry} style={{
              padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.b2}`,
              background: C.bg2, color: C.t2, cursor: 'pointer', fontSize: 11,
              display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600,
            }}>
              <RotateCcw size={11} /> Thử lại
            </button>
          </div>
        )}
        {!isLoading && dataUrl && (
          <img src={dataUrl} alt={`Scene ${idx + 1}`}
            style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
            onClick={() => {
              const w = window.open()
              w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;max-height:100vh"></body>`)
            }}
          />
        )}
        {!isLoading && !dataUrl && !error && (
          <div style={{ padding: 36, textAlign: 'center' }}>
            <ImageIcon size={24} style={{ color: C.b2, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 10, color: C.t3 }}>Chờ render...</p>
          </div>
        )}
        {klingSelected && dataUrl && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: C.fu, color: '#fff',
            fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
            letterSpacing: '0.06em',
          }}>KLING</span>
        )}
      </div>

      {/* Actions */}
      {dataUrl && qualitySignal && (
        <div style={{
          padding: '7px 10px',
          borderTop: `1px solid ${C.b1}`,
          fontSize: 10,
          color: qualitySignal.detailScore < 0.3 ? C.or : C.green,
          background: qualitySignal.detailScore < 0.3 ? 'rgba(249,115,22,0.08)' : 'rgba(34,197,94,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>Detail score: {(qualitySignal.detailScore * 100).toFixed(0)}%</span>
          <span>{qualitySignal.pass === 'recovery' ? 'Auto-recovery ✓' : 'Direct render'}</span>
        </div>
      )}
      {dataUrl && (
        <div style={{ display: 'flex', borderTop: `1px solid ${C.b1}` }}>
          {[
            { icon: <Download size={12} />, label: 'Tải về', fn: onDownload },
            { icon: saveOk ? <Check size={12} /> : <BookImage size={12} />, label: saveOk ? 'Đã lưu' : 'Lưu kho', fn: handleSave, ok: saveOk },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={saving} className="pd-action" style={{
              flex: 1, padding: '9px 0', background: b.ok ? 'rgba(34,197,94,.08)' : 'transparent',
              border: 'none', borderRight: i === 0 ? `1px solid ${C.b1}` : 'none',
              color: b.ok ? C.green : C.t3, cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontWeight: 600,
            }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      )}

      {/* Edit / Redraw chat */}
      {(dataUrl || error) && (
        <div style={{ borderTop: `1px solid ${C.b1}` }}>
          {!editOpen ? (
            <button onClick={() => setEditOpen(true)} className="pd-action" style={{
              width: '100%', padding: '8px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.t3, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Zap size={11} color={C.or} />
              Yêu cầu chỉnh sửa / Vẽ lại
            </button>
          ) : (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Tuỳ chọn nhanh
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                  {[
                    { key: 'glow',   label: 'Da glow',      active: qGlow,   set: setQGlow,   color: '#22d3ee' },
                    { key: 'bust',   label: 'Độ loa',       active: qBust,   set: setQBust,   color: '#ec4899' },
                    { key: 'skin',   label: 'Trắng da',     active: qSkin,   set: setQSkin,   color: '#f5d0c5' },
                    { key: 'figure', label: 'Chân dài/Eo', active: qFigure, set: setQFigure, color: '#a78bfa' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => opt.set(!opt.active)}
                      title={opt.key === 'glow' ? 'Glass skin K-beauty hậu kỳ, giữ texture thật'
                           : opt.key === 'bust' ? 'Chỉ tăng vòng 1, giữ nguyên ảnh gốc'
                           : opt.key === 'skin' ? 'Trắng da chân thực, không nhựa hoá AI'
                           : 'Kéo chân dài + eo đồng hồ cát, giữ nguyên ảnh gốc'}
                      style={{
                        padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
                        border: opt.active ? `1px solid ${opt.color}` : `1px solid ${C.b2}`,
                        background: opt.active ? `${opt.color}22` : 'none',
                        color: opt.active ? opt.color : C.t3,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.01em',
                        transition: 'all 120ms',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {opt.active && <span style={{ fontSize: 9 }}>✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditRedraw() }}
                placeholder={hasAnyQuick ? 'Thêm yêu cầu khác (không bắt buộc)...' : 'Mô tả chỉnh sửa... (vd: thay nền thành biển, váy đỏ hơn...)'}
                rows={2}
                style={{
                  width: '100%', background: C.bg0, border: `1px solid ${C.b2}`,
                  borderRadius: 8, padding: '8px 10px', color: C.t1,
                  fontSize: 12, lineHeight: 1.5, resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setEditOpen(false); setEditText(''); setQGlow(false); setQBust(false); setQSkin(false); setQFigure(false) }} style={{
                  flex: 1, padding: '7px 0', borderRadius: 7,
                  border: `1px solid ${C.b2}`, background: 'none',
                  color: C.t3, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>Huỷ</button>
                <button onClick={handleEditRedraw} disabled={!canSubmit} style={{
                  flex: 2, padding: '7px 0', borderRadius: 7, border: 'none',
                  background: editBusy ? C.b2 : `linear-gradient(90deg, ${C.or}, ${C.re})`,
                  color: '#fff', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  opacity: canSubmit ? 1 : 0.5,
                }}>
                  {editBusy
                    ? <><div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Đang vẽ...</>
                    : <><Zap size={11} /> Vẽ lại</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PhoiDoPage() {
  const [refEntries, setRefEntries]       = useState([])
  const [outfitEntries, setOutfitEntries] = useState([])
  const [poseEntries, setPoseEntries]     = useState([])
  const [bgEntry, setBgEntry]             = useState(null)
  const [bgPreset, setBgPreset]           = useState('')
  const [bgPresetExpanded, setBgPresetExpanded] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput]         = useState('')
  const chatEndRef = useRef(null)

  const [quality, setQuality] = useState('4K (Ultra)')
  const [aspect, setAspect]   = useState('9:16')
  const [mood, setMood]       = useState('🤖 AI tự chọn')
  const [makeup, setMakeup]   = useState('🤖 AI tự chọn')

  const [plan, setPlan]               = useState(null)
  const [planning, setPlanning]       = useState(false)
  const [planExpanded, setPlanExpanded] = useState(false)
  const [results, setResults]         = useState([null, null, null, null])
  const [loading, setLoading]         = useState([false, false, false, false])
  const [errors, setErrors]           = useState([null, null, null, null])
  const [generating, setGenerating]   = useState(false)
  const [planError, setPlanError]     = useState('')
  const [qualitySignals, setQualitySignals] = useState([null, null, null, null])
  const [klingSelected, setKlingSelected] = useState([])

  const [pickerOpen, setPickerOpen]     = useState(false)
  const [pickerTarget, setPickerTarget] = useState(null)

  const [poseLibraryOpen, setPoseLibraryOpen] = useState(false)
  const [poseCategory, setPoseCategory] = useState('all')
  const poseLibraryItems = getAllPosesByCategory(poseCategory)

  const refInput    = useRef()
  const outfitInput = useRef()
  const poseInput   = useRef()
  const bgInput     = useRef()
  const generateBusyRef = useRef(false)

  /* ─── handlers ────────────────────────────────────────────────────────── */
  function addFiles(files, type) {
    const entries = Array.from(files).map(f => ({ file: f, url: URL.createObjectURL(f) }))
    if (type === 'ref')    setRefEntries(p => [...p, ...entries].slice(0, 2))
    if (type === 'outfit') setOutfitEntries(p => [...p, ...entries].slice(0, 4))
    if (type === 'pose')   setPoseEntries(p => [...p, ...entries].slice(0, 1))
    if (type === 'bg')     setBgEntry(entries[0] || null)
  }
  function openPicker(type) { setPickerTarget(type); setPickerOpen(true) }
  async function handlePickLibrary(item) {
    let url = item.imageSrc || item.url
    try {
      const originalDataUrl = await getOriginalImage(item.id)
      if (originalDataUrl) url = originalDataUrl
    } catch {}
    const entry = { url, file: null }
    if (pickerTarget === 'ref')    setRefEntries(p => [...p, entry].slice(0, 2))
    if (pickerTarget === 'outfit') setOutfitEntries(p => [...p, entry].slice(0, 4))
    if (pickerTarget === 'pose')   setPoseEntries(p => [...p, entry].slice(0, 1))
    if (pickerTarget === 'bg')     setBgEntry(entry)
    setPickerOpen(false)
  }
  function toggleKling(idx) {
    setKlingSelected(p => {
      if (p.includes(idx)) return p.filter(i => i !== idx)
      if (p.length >= 2) return p
      return [...p, idx].sort()
    })
  }

  function sendChat() {
    const text = chatInput.trim()
    if (!text) return
    setChatMessages(p => [...p, { role: 'user', text, time: Date.now() }])
    setChatInput('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function getStoryline() {
    return chatMessages.filter(m => m.role === 'user').map(m => m.text).join('. ')
  }

  function buildAnalysisImages(refFiles, outfitFiles, poseFile, bgFile) {
    return [
      ...refFiles.slice(0, 2),
      ...outfitFiles.slice(0, 2),
      ...(poseFile ? [poseFile] : []),
      ...(bgFile ? [bgFile] : []),
    ].slice(0, 6)
  }

  function buildGenerationRefs(refFiles, outfitFiles, poseFile, bgFile) {
    const picked = []

    // Priority order: identity refs -> main outfit -> pose -> background -> extra outfit refs
    picked.push(...refFiles.slice(0, 2))
    if (outfitFiles[0]) picked.push(outfitFiles[0])
    if (poseFile) picked.push(poseFile)
    if (bgFile) picked.push(bgFile)

    if (picked.length < 5) {
      const remain = 5 - picked.length
      picked.push(...outfitFiles.slice(1, 1 + remain))
    }

    return picked.slice(0, 5)
  }

  async function handleGenerate() {
    if (generateBusyRef.current) return
    if (refEntries.length === 0 && outfitEntries.length === 0) return
    generateBusyRef.current = true
    setPlanError(''); setPlan(null)
    setQualitySignals([null, null, null, null])
    setResults([null, null, null, null]); setErrors([null, null, null, null]); setKlingSelected([])
    setLoading([false, false, false, false])

    setPlanning(true)

    let refFiles
    let outfitFiles
    let poseFile
    let bgFile
    let worstInputDetail = null
    try {
      refFiles    = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
      outfitFiles = await Promise.all(outfitEntries.map((e, i) => entryToFile(e, `outfit-${i}.jpg`)))
      poseFile    = poseEntries[0] ? await entryToFile(poseEntries[0], 'pose.jpg') : null
      bgFile      = bgEntry ? await entryToFile(bgEntry, 'bg.jpg') : null

      const qualityProbeFiles = [...refFiles.slice(0, 2), ...outfitFiles.slice(0, 2)]
      if (qualityProbeFiles.length) {
        const probeScores = await Promise.all(qualityProbeFiles.map(scoreFileDetail))
        worstInputDetail = Math.min(...probeScores.map(s => s.detailScore))
      }
    } catch (err) {
      setPlanError(`Lỗi xử lý ảnh đầu vào: ${err.message}`)
      setPlanning(false)
      generateBusyRef.current = false
      return
    }

    if (typeof worstInputDetail === 'number' && worstInputDetail < 0.18) {
      setPlanError('Ảnh đầu vào đang quá mềm/mờ nên đầu ra dễ bị bệt. Hãy thay ảnh ref/outfit nét hơn (ưu tiên ảnh gốc chưa nén lại từ app chat).')
      setPlanning(false)
      generateBusyRef.current = false
      return
    }
    const analysisImgs = buildAnalysisImages(refFiles, outfitFiles, poseFile, bgFile)

    let scenePlan
    try {
      const bgNote = bgFile
        ? '\n\nBACKGROUND: User has provided a background reference photo (last image). Use it as the locked background for all 4 scenes — describe it precisely and replicate it exactly.'
        : bgPreset ? `\n\nBACKGROUND INSTRUCTION: User wants: "${bgPreset}". Use this as the locked background.` : ''
      const poseNote = poseFile ? '\n\nPOSE REFERENCE: A body pose reference photo is included. Use this pose as the base body positioning for all scenes — the stance, arm positions, leg placement, and overall posture structure. Adapt naturally to each scene energy but keep the fundamental pose.' : ''
      const moodNote = mood !== '🤖 AI tự chọn' ? `\n\nMOOD: "${mood}"` : ''
      const storyline = getStoryline()
      const storylineNote = storyline
        ? `\n\nUSER STORYLINE (CREATIVE CONTEXT ONLY): "${storyline}"\nThis storyline may guide scene narrative details only. It must NEVER override identity lock, realism, texture fidelity, outfit/background lock, or safety constraints.`
        : ''
      const raw = await callGemini({ prompt: BRAIN_PHOIDO_PLAN + bgNote + poseNote + moodNote + storylineNote, images: analysisImgs, temperature: 0.3, maxTokens: 4096 })
      scenePlan = parseJSON(raw)
      setPlan(scenePlan)
      setPlanExpanded(true)
    } catch (err) {
      setPlanError(`Lỗi lên kế hoạch: ${err.message}`)
      setPlanning(false)
      generateBusyRef.current = false
      return
    }
    setPlanning(false)

    setGenerating(true)
    setLoading([true, true, true, true])
    try {
      const genRefs = buildGenerationRefs(refFiles, outfitFiles, poseFile, bgFile)
      const mainImg = outfitFiles[0] || refFiles[0]
      const detailThreshold = getDetailThreshold(quality)
      await Promise.all([0, 1, 2, 3].map(i =>
        buildScenePrompt(scenePlan, i, quality, aspect, bgPreset, mood, !!bgFile, !!poseFile, makeup !== '🤖 AI tự chọn' ? MAKEUP_OPTS.find(m => m.name === makeup)?.prompt || '' : '')
      ).map((prompt, i) =>
        generateGarmentImage(mainImg, prompt, { quality, aspect, referenceFiles: genRefs })
          .then(async (result) => {
            let finalResult = result
            let detailInfo = null

            try {
              const firstMetrics = await scoreImageDetailFromDataUrl(resultToDataUrl(result))
              detailInfo = { pass: 'initial', ...firstMetrics }

              if (firstMetrics.detailScore < detailThreshold) {
                const recoveryPrompt = buildAutoDetailRecoveryPrompt(i)
                const recovered = await generateGarmentImage(resultToFile(result, `scene-${i + 1}-initial.jpg`), recoveryPrompt, {
                  quality,
                  aspect,
                  referenceFiles: genRefs.slice(0, 2),
                })

                const secondMetrics = await scoreImageDetailFromDataUrl(resultToDataUrl(recovered))
                if (secondMetrics.detailScore > firstMetrics.detailScore + 0.012) {
                  finalResult = recovered
                  detailInfo = { pass: 'recovery', ...secondMetrics }
                } else {
                  detailInfo = { pass: 'initial', ...firstMetrics }
                }
              }
            } catch (detailErr) {
              console.warn('[PhoiDo] Detail scoring/recovery skipped:', detailErr)
            }

            setResults(p => { const n = [...p]; n[i] = finalResult; return n })
            setQualitySignals(p => { const n = [...p]; n[i] = detailInfo; return n })
            setErrors(p => { const n = [...p]; n[i] = null; return n })
          })
          .catch(err => { setErrors(p => { const n = [...p]; n[i] = err.message; return n }) })
          .finally(() => { setLoading(p => { const n = [...p]; n[i] = false; return n }) })
      ))
    } finally {
      setGenerating(false)
      generateBusyRef.current = false
    }
  }

  async function retryScene(idx, editInstruction = '') {
    if (!plan) return
    setLoading(p => { const n = [...p]; n[idx] = true; return n })
    setErrors(p => { const n = [...p]; n[idx] = null; return n })
    try {
      let prompt, mainImg, genRefs

      if (editInstruction && results[idx]) {
        // ═══ EDIT MODE: retouch rendered image ═══
        // Pass rendered image as mainImg so AI sees what to retouch
        const renderedFile = resultToFile(results[idx], 'rendered.jpg')
        mainImg = renderedFile
        // Only KOL refs for face identity — no outfit/pose/bg (they're already in the rendered image)
        const refFiles = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
        genRefs = refFiles.slice(0, 2)
        // Use focused edit prompt — NOT full generation prompt
        prompt = buildEditPrompt(editInstruction, idx)
      } else {
        // ═══ REGENERATE MODE: full new generation ═══
        const refFiles    = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
        const outfitFiles = await Promise.all(outfitEntries.map((e, i) => entryToFile(e, `outfit-${i}.jpg`)))
        const poseFileR   = poseEntries[0] ? await entryToFile(poseEntries[0], 'pose.jpg') : null
        const bgFile      = bgEntry ? await entryToFile(bgEntry, 'bg.jpg') : null
        genRefs = buildGenerationRefs(refFiles, outfitFiles, poseFileR, bgFile)
        mainImg = outfitFiles[0] || refFiles[0]
        const makeupPrompt = makeup !== '🤖 AI tự chọn' ? MAKEUP_OPTS.find(m => m.name === makeup)?.prompt || '' : ''
        prompt = buildScenePrompt(plan, idx, quality, aspect, bgPreset, mood, !!bgFile, !!poseFileR, makeupPrompt)
      }

      const result = await generateGarmentImage(mainImg, prompt, { quality, aspect, referenceFiles: genRefs })
      let finalResult = result
      let detailInfo = null

      try {
        const firstMetrics = await scoreImageDetailFromDataUrl(resultToDataUrl(result))
        const detailThreshold = getDetailThreshold(quality)
        detailInfo = { pass: 'initial', ...firstMetrics }

        if (!editInstruction && firstMetrics.detailScore < detailThreshold) {
          const recoveryPrompt = buildAutoDetailRecoveryPrompt(idx)
          const recovered = await generateGarmentImage(resultToFile(result, `scene-${idx + 1}-retry.jpg`), recoveryPrompt, {
            quality,
            aspect,
            referenceFiles: genRefs.slice(0, 2),
          })
          const secondMetrics = await scoreImageDetailFromDataUrl(resultToDataUrl(recovered))
          if (secondMetrics.detailScore > firstMetrics.detailScore + 0.012) {
            finalResult = recovered
            detailInfo = { pass: 'recovery', ...secondMetrics }
          }
        }
      } catch (detailErr) {
        console.warn('[PhoiDo] Retry detail scoring/recovery skipped:', detailErr)
      }

      setResults(p => { const n = [...p]; n[idx] = finalResult; return n })
      setQualitySignals(p => { const n = [...p]; n[idx] = detailInfo; return n })
    } catch (err) { setErrors(p => { const n = [...p]; n[idx] = err.message; return n }) }
    setLoading(p => { const n = [...p]; n[idx] = false; return n })
  }

  async function saveKlingFrames() {
    try {
      for (const idx of klingSelected) {
        const r = results[idx]; if (!r) continue
        const folderId = await getOrCreateFolder('Phối Đồ')
        const record = createLibraryRecord({
          name: `Kling Frame ${idx + 1} · ${new Date().toLocaleDateString('vi-VN')}`,
          type: 'outfit', category: 'phoi-do',
          imageSrc: `data:${r.mimeType};base64,${r.base64}`,
          source: 'phoi-do', folderId,
        })
        const res = await saveToLibrary(record)
        if (res?.success === false) throw new Error(res.error || 'Không thể lưu frame vào thư viện')
      }
      alert('Đã lưu 2 Kling frame vào Thư Viện → folder "Phối Đồ".\nSang Kling AI Fashion → Multi-Shot 15s để tạo video!')
    } catch (err) {
      alert(`Lưu Kling frame thất bại: ${err.message}`)
    }
  }

  const canGenerate  = (refEntries.length > 0 || outfitEntries.length > 0) && !planning && !generating
  const hasAnyResult = results.some(Boolean)
  const klingReady   = klingSelected.length === 2
  const avgDetailScore = qualitySignals.filter(Boolean).length
    ? qualitySignals.filter(Boolean).reduce((acc, s) => acc + (s.detailScore || 0), 0) / qualitySignals.filter(Boolean).length
    : null

  /* ─── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg0, minHeight: '100vh', margin: '-32px', padding: '0 0 100px' }}>
      <style>{CSS}</style>

      {pickerOpen && <LibraryPickerModal onSelect={handlePickLibrary} onClose={() => setPickerOpen(false)} />}
      <input ref={refInput}    type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'ref');    e.target.value = '' }} />
      <input ref={outfitInput} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'outfit'); e.target.value = '' }} />
      <input ref={poseInput}   type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'pose');   e.target.value = '' }} />
      <input ref={bgInput}     type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'bg');     e.target.value = '' }} />

      {/* ═══ HERO HEADER ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.re} 0%, #a01010 30%, #1a0808 60%, ${C.bg0} 100%)`,
        padding: '36px 32px 28px',
        marginBottom: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glows */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(249,115,22,0.15)', filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: 80,
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(220,38,38,0.12)', filter: 'blur(50px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              Phối Đồ
            </h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { t: '4 phân cảnh', c: '#fb923c' },
                { t: 'Face Lock 100%', c: '#f87171' },
                { t: 'Nền cố định', c: '#60a5fa' },
                { t: 'POSE tham chiếu', c: '#fbbf24' },
                { t: 'KOL → Ống kính', c: '#e879f9' },
                { t: 'Skin tự nhiên', c: '#4ade80' },
                { t: 'Kling-ready', c: '#e879f9' },
              ].map(tag => (
                <span key={tag.t} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: tag.c,
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid rgba(255,255,255,0.15)`,
                  padding: '3px 9px', borderRadius: 20,
                  backdropFilter: 'blur(4px)',
                }}>{tag.t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 0' }}>

      {/* ═══ SECTION 1: ASSETS ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tài nguyên đầu vào
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.6fr', gap: 20 }}>
          {/* KOL */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>
              KOL / Người mẫu <span style={{ color: C.t3, fontWeight: 400, fontSize: 11 }}>(tối đa 2)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[0,1].map(i => (
                <Slot key={i}
                  src={refEntries[i]?.url}
                  label={i === 0 && refEntries[0] ? 'KOL' : null}
                  onRemove={() => setRefEntries(p => p.filter((_,j) => j !== i))}
                  onUpload={() => refInput.current.click()}
                  onLibrary={() => openPicker('ref')}
                />
              ))}
            </div>
          </div>
          {/* Outfit & Accessories */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>
              Trang phục & Phụ kiện <span style={{ color: C.t3, fontWeight: 400, fontSize: 11 }}>(tối đa 4)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[0,1,2,3].map(i => (
                <Slot key={i}
                  src={outfitEntries[i]?.url}
                  label={i === 0 && outfitEntries[0] ? 'OUTFIT' : null}
                  onRemove={() => setOutfitEntries(p => p.filter((_,j) => j !== i))}
                  onUpload={() => outfitInput.current.click()}
                  onLibrary={() => openPicker('outfit')}
                />
              ))}
            </div>
          </div>
          {/* Pose */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1, display: 'flex', alignItems: 'center', gap: 6 }}>
              Dáng Pose
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                color: '#fbbf24', background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.3)',
                padding: '2px 7px', borderRadius: 20,
              }}>TUỲ CHỌN</span>
            </p>
            <div style={{ maxWidth: 90 }}>
              <Slot
                src={poseEntries[0]?.url}
                label={poseEntries[0] ? 'POSE' : null}
                onRemove={() => setPoseEntries([])}
                onUpload={() => poseInput.current.click()}
                onLibrary={() => openPicker('pose')}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setPoseLibraryOpen(v => !v)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: 7,
                  border: `1px dashed ${C.b2}`, background: 'transparent',
                  color: C.t2, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookImage size={10} /> {poseLibraryOpen ? 'Thu gọn thư viện' : `Kho Pose (${POSE_LIBRARY.length})`}
                </span>
                {poseLibraryOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.5 }}>
              Ảnh tham chiếu dáng đứng / tư thế của KOL
            </p>
          </div>
        </div>

        {/* ─── POSE LIBRARY PANEL (expanded) ─── */}
        {poseLibraryOpen && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 10,
            background: C.bg0, border: `1px solid ${C.b1}`,
          }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {POSE_CATEGORIES.map(cat => {
                const on = poseCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setPoseCategory(cat.id)}
                    style={{
                      padding: '5px 10px', borderRadius: 16, cursor: 'pointer',
                      border: on ? `1px solid ${C.or}` : `1px solid ${C.b2}`,
                      background: on ? C.or : 'transparent',
                      color: on ? '#fff' : C.t2,
                      fontSize: 10, fontWeight: on ? 700 : 500,
                      transition: 'all 150ms',
                    }}
                  >{cat.label}</button>
                )
              })}
            </div>

            {/* Pose cards grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8, maxHeight: 380, overflowY: 'auto', padding: 2,
            }}>
              {poseLibraryItems.map(p => {
                const isActive = poseEntries[0]?.url === p.thumbnail
                return (
                  <button
                    key={p.id}
                    onClick={() => setPoseEntries([{ url: p.thumbnail, file: null, poseName: p.name, promptEN: p.promptEN }])}
                    title={p.description || p.name}
                    style={{
                      position: 'relative', display: 'flex', flexDirection: 'column',
                      padding: 0, borderRadius: 8, cursor: 'pointer', overflow: 'hidden',
                      border: isActive ? `2px solid ${C.or}` : `1px solid ${C.b2}`,
                      background: C.bg2,
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      aspectRatio: '3/4', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => {
                          e.target.style.display = 'none'
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                      <div style={{
                        display: 'none', position: 'absolute', inset: 0,
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 36, color: C.t3, background: C.bg2,
                      }}>{p.emoji}</div>
                      {isActive && (
                        <span style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 18, height: 18, borderRadius: '50%',
                          background: C.or, color: '#fff',
                          display: 'grid', placeItems: 'center',
                        }}><Check size={10} /></span>
                      )}
                    </div>
                    <div style={{ padding: '6px 6px 7px', textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.t1, lineHeight: 1.25 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 9, color: C.t3, marginTop: 2, lineHeight: 1.3 }}>
                        {p.bodyFocus}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.5 }}>
              💡 Click 1 pose để làm tham chiếu dáng cho toàn bộ 4 phân cảnh.
            </p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: BACKGROUND ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Hậu cảnh <span style={{ color: C.t3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— cố định cả 4 phân cảnh</span>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: bgEntry ? '100px 1fr' : '80px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Left: upload/preview */}
          <div>
            {bgEntry ? (
              <div className="pd-slot" style={{
                position: 'relative', aspectRatio: '1', borderRadius: 10,
                overflow: 'hidden', border: `2px solid ${C.or}`,
              }}>
                <img src={bgEntry.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setBgEntry(null)} style={{
                  position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                  borderRadius: 5, background: 'rgba(0,0,0,.7)', border: 'none',
                  color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}><X size={9} /></button>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: C.or, color: '#fff', fontSize: 7, fontWeight: 800,
                  textAlign: 'center', padding: '2.5px 0', letterSpacing: '0.08em',
                }}>ƯU TIÊN #1</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => bgInput.current.click()} className="pd-slot" style={{
                  width: '100%', padding: '12px 0', borderRadius: 10,
                  border: `1px dashed ${C.b2}`, background: C.bg2,
                  color: C.t3, cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 5,
                }}>
                  <Upload size={15} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
                </button>
                <button onClick={() => openPicker('bg')} className="pd-slot" style={{
                  width: '100%', padding: '8px 0', borderRadius: 10,
                  border: `1px dashed ${C.b2}`, background: C.bg2,
                  color: C.t3, cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9,
                }}>
                  <BookImage size={12} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.t3 }}>
                {bgEntry ? 'Ảnh upload sẽ được ưu tiên.' : 'Hoặc chọn nền:'}
              </span>
              {bgPreset && !bgEntry && (
                <button onClick={() => setBgPreset('')} style={{
                  background: 'none', border: 'none', color: C.t3, cursor: 'pointer',
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 3,
                }}><X size={10} /> Bỏ</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(bgPresetExpanded ? BG_PRESETS : BG_PRESETS.slice(0, 4)).map(p => {
                const on = bgPreset === p
                return (
                  <button key={p} onClick={() => setBgPreset(on ? '' : p)} className="pd-bg-opt" style={{
                    padding: '7px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                    border: on ? `1px solid ${C.or}` : `1px solid ${C.b1}`,
                    background: on ? C.orBg : 'transparent',
                    color: on ? C.or : C.t3, fontSize: 11, fontWeight: on ? 600 : 400,
                    opacity: bgEntry ? 0.35 : 1,
                  }}>{p}</button>
                )
              })}
              <button onClick={() => setBgPresetExpanded(p => !p)} style={{
                padding: '5px 12px', borderRadius: 8, border: `1px dashed ${C.b1}`,
                background: 'transparent', color: C.t3, cursor: 'pointer',
                fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {bgPresetExpanded ? <><ChevronUp size={11} /> Thu gọn</> : <><ChevronDown size={11} /> +{BG_PRESETS.length - 4} nền</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2.5: CHAT / KỊCH BẢN ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 12, borderColor: chatMessages.length > 0 ? C.orBd : C.b1 }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={13} style={{ color: C.or }} />
          Kịch bản & Yêu cầu
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', padding: '2px 7px', borderRadius: 20, textTransform: 'none' }}>ƯU TIÊN CAO NHẤT</span>
        </p>

        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10, display: chatMessages.length > 0 ? 'block' : 'none' }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 6,
            }}>
              <div style={{
                maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
                background: msg.role === 'user' ? C.orBg : C.bg2,
                border: `1px solid ${msg.role === 'user' ? C.orBd : C.b1}`,
                fontSize: 12, lineHeight: 1.5, color: msg.role === 'user' ? C.orL : C.t2,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
            placeholder="Viết kịch bản, yêu cầu... (vd: Cô ấy đứng trước gương lớn, ánh sáng vàng kem, nở nụ cười tự tin...)"
            style={{
              flex: 1, background: C.bg0, border: `1px solid ${chatInput.trim() ? C.orBd : C.b2}`,
              borderRadius: 10, padding: '10px 14px', color: C.t1,
              fontSize: 12, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={sendChat} disabled={!chatInput.trim()} style={{
            width: 42, borderRadius: 10, border: 'none', cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
            background: chatInput.trim() ? `linear-gradient(135deg, ${C.or}, ${C.re})` : C.bg2,
            color: chatInput.trim() ? '#fff' : C.t3,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Send size={16} />
          </button>
        </div>

        {chatMessages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <p style={{ margin: '0 0 3px', fontSize: 11, color: C.or, fontWeight: 600 }}>
                Kịch bản chỉ dùng để định hướng sáng tạo, không ghi đè rule texture/identity/safety/chest-fill lock
              </p>
            <button onClick={() => setChatMessages([])} style={{
              background: 'none', border: 'none', color: C.t3, cursor: 'pointer',
              fontSize: 10, display: 'flex', alignItems: 'center', gap: 3,
            }}><X size={10} /> Xoá hết</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: SETTINGS ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 20 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Cấu hình
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Quality */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Chất lượng</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {QUALITY_OPTS.map(q => {
                const on = quality === q
                return (
                  <button key={q} onClick={() => setQuality(q)} className="pd-pill" style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                    border: on ? `1.5px solid ${C.or}` : `1px solid ${C.b2}`,
                    background: on ? C.orBg : C.bg2, color: on ? C.or : C.t3,
                    fontSize: 12, fontWeight: on ? 700 : 400,
                  }}>{q}</button>
                )
              })}
            </div>
          </div>
          {/* Mood */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Phong cách</p>
            <div style={{ position: 'relative' }}>
              <select value={mood} onChange={e => setMood(e.target.value)} style={{
                width: '100%', padding: '9px 12px', borderRadius: 10, appearance: 'none',
                border: `1px solid ${mood !== '🤖 AI tự chọn' ? C.orBd : C.b2}`,
                background: C.bg2, color: mood !== '🤖 AI tự chọn' ? C.or : C.t3,
                fontSize: 12, cursor: 'pointer', fontWeight: mood !== '🤖 AI tự chọn' ? 600 : 400,
              }}>
                {MOOD_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.t3, pointerEvents: 'none' }} />
            </div>
          </div>
          {/* Makeup */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Trang điểm</p>
            <div style={{ position: 'relative' }}>
              <select value={makeup} onChange={e => setMakeup(e.target.value)} style={{
                width: '100%', padding: '9px 12px', borderRadius: 10, appearance: 'none',
                border: `1px solid ${makeup !== '🤖 AI tự chọn' ? '#ec489966' : C.b2}`,
                background: C.bg2, color: makeup !== '🤖 AI tự chọn' ? '#ec4899' : C.t3,
                fontSize: 12, cursor: 'pointer', fontWeight: makeup !== '🤖 AI tự chọn' ? 600 : 400,
              }}>
                {MAKEUP_OPTS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.t3, pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Aspect */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Tỷ lệ ảnh</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASPECT_OPTS.map(opt => {
              const on = aspect === opt.v
              return (
                <button key={opt.v} onClick={() => setAspect(opt.v)} className="pd-pill" style={{
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                  border: on ? `1.5px solid ${C.or}` : `1px solid ${C.b2}`,
                  background: on ? C.orBg : C.bg2, color: on ? C.or : C.t3,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{opt.label}</div>
                  <div style={{ fontSize: 9, opacity: .6, marginTop: 1 }}>{opt.sub}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ GENERATE BUTTON ═══ */}
      <button className="pd-gen" onClick={handleGenerate} disabled={!canGenerate} style={{
        width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
        cursor: canGenerate ? 'pointer' : 'not-allowed',
        background: canGenerate
          ? `linear-gradient(135deg, ${C.re}, #c02020, ${C.or}, #fb923c)`
          : C.bg2,
        backgroundSize: '200% auto',
        animation: (planning || generating) ? 'shimmer 2s linear infinite' : 'none',
        color: canGenerate ? '#fff' : C.t3,
        fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: canGenerate ? '0 4px 28px rgba(220,38,38,0.35)' : 'none',
        marginBottom: 20,
      }}>
        {planning ? (
          <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />Đang lên kế hoạch...</>
        ) : generating ? (
          <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />Rendering {results.filter(Boolean).length}/4...</>
        ) : (
          <><Zap size={16} />Tạo 4 Phân Cảnh · {quality} · {aspect}</>
        )}
      </button>

      {planError && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,.06)', border: `1px solid rgba(239,68,68,.2)`,
          color: C.red, fontSize: 13,
        }}>{planError}</div>
      )}

      {/* ═══ AI PLAN PREVIEW ═══ */}
      {plan && (
        <div className="pd-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <button onClick={() => setPlanExpanded(p => !p)} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: planExpanded ? 14 : 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Kế hoạch AI
            </span>
            {planExpanded ? <ChevronUp size={14} style={{ color: C.t3 }} /> : <ChevronDown size={14} style={{ color: C.t3 }} />}
          </button>
          {planExpanded && (
            <>
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: C.bg2, borderLeft: `3px solid ${C.bl}`,
              }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: C.bl, letterSpacing: '0.08em' }}>LOCKED BACKGROUND</p>
                <p style={{ margin: 0, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{plan.lockedBackground}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {plan.scenes?.map((sc, i) => {
                  const accent = [C.s1, C.s2, C.s3, C.s4][i]
                  return (
                    <div key={i} style={{
                      background: C.bg2, borderRadius: 10, padding: '10px 12px',
                      borderTop: `2px solid ${accent}`,
                    }}>
                      <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 800, color: accent, letterSpacing: '0.08em' }}>
                        SCENE {sc.num}
                      </p>
                      <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.t1 }}>{sc.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: C.t3, lineHeight: 1.4 }}>{sc.klingNote}</p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {(hasAnyResult || loading.some(Boolean) || errors.some(Boolean)) && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.t1 }}>4 Phân Cảnh</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: C.t3 }}>
                Bấm <Video size={10} style={{ verticalAlign: 'middle', color: C.fu }} /> chọn 2 frame → Kling video
              </p>
              {avgDetailScore !== null && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: avgDetailScore < 0.3 ? C.or : C.green }}>
                  Quality signal: {(avgDetailScore * 100).toFixed(0)}% · {avgDetailScore < 0.3 ? 'cần ảnh input nét hơn' : 'chi tiết ổn'}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0,1,2,3].map(i => {
                const accent = [C.s1, C.s2, C.s3, C.s4][i]
                return (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: results[i] ? accent : loading[i] ? `${accent}50` : C.b2,
                    border: `1.5px solid ${results[i] || loading[i] ? accent : C.b2}`,
                    transition: 'all .3s',
                  }} />
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[0,1,2,3].map(i => (
              <SceneCard key={i} idx={i}
                scene={plan?.scenes?.[i]} result={results[i]}
                isLoading={loading[i]} error={errors[i]}
                qualitySignal={qualitySignals[i]}
                klingSelected={klingSelected.includes(i)}
                onToggleKling={() => toggleKling(i)}
                onRetry={() => retryScene(i)}
                onEditRedraw={(idx, instruction) => retryScene(idx, instruction)}
                onDownload={() => results[i] && downloadImage(
                  `data:${results[i].mimeType};base64,${results[i].base64}`,
                  `phoi-do-${i + 1}-${Date.now()}.jpg`
                )}
              />
            ))}
          </div>

          {/* Kling CTA */}
          {klingReady && (
            <div style={{
              padding: '16px 20px', borderRadius: 14,
              background: C.fuBg, border: `1px solid ${C.fuBd}`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.t1 }}>
                  {klingSelected.length} Kling frames sẵn sàng
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.t3 }}>
                  Lưu → Thư Viện → Kling AI Fashion → Multi-Shot 15s
                </p>
              </div>
              <button onClick={saveKlingFrames} style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.fu}, #a855f7)`,
                color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(217,70,239,0.25)',
              }}>
                <Video size={14} /> LƯU KLING
              </button>
            </div>
          )}
          {klingSelected.length === 1 && (
            <p style={{ textAlign: 'center', fontSize: 11, color: C.t3, marginTop: 10 }}>
              Chọn thêm 1 phân cảnh để tạo cặp frame Kling
            </p>
          )}
        </div>
      )}
      </div>{/* end content wrapper */}
    </div>
  )
}
