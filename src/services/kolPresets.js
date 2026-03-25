/**
 * kolPresets.js
 * ─────────────────────────────────────────────────────────────────────────────
 * KOL Skin / Makeup / Camera Presets — đã validate qua nhiều phiên test.
 * Tất cả combo ở đây đều cho ra da trắng sữa, không vàng, không cam quá đậm.
 *
 * Nguyên tắc:
 *  - Indoor/Studio + Cool light (5800K-6200K) = DA TRẮNG ✅
 *  - Outdoor/Golden/Warm light = DA VÀNG ❌
 *  - KHÔNG dùng "Vietnamese" hay "Southeast Asian" để tránh bias da vàng
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA PRESETS — Đã test OK
// ═══════════════════════════════════════════════════════════════════════════════
export const CAMERA_PRESETS = [
    {
        id: 'auto',
        name: '🤖 Auto (AI tự chọn)',
        prompt: '',
    },
    {
        id: 'canon_r5ii_85mm',
        name: '📷 Canon R5 II + 85mm f/1.2',
        description: 'Da mịn tự nhiên, bokeh mơ màng — Combo Babe Cute',
        prompt: 'ultra photorealistic Canon EOS R5 Mark II, Canon RF 85mm f/1.2L USM at f/1.2, ISO 100, Canon color science with natural skin smoothing and healthy pink skin rendering, tack-sharp focus on eyes and lips, ultra creamy circular f/1.2 bokeh',
    },
    {
        id: 'sony_a7rv_135mm',
        name: '📷 Sony A7R V + 135mm f/1.8',
        description: 'Sắc nét cực cao, tông trung tính — Combo Cold Beauty',
        prompt: 'ultra photorealistic Sony A7R V 61 megapixel, Sony FE 135mm f/1.8 GM at f/1.8, ISO 100, 135mm focal compression flattering facial features, extreme optical sharpness with tack-sharp focus on eyes and lips, Sony neutral accurate color science',
    },
    {
        id: 'canon_r5ii_50mm',
        name: '📷 Canon R5 II + 50mm f/1.2',
        description: 'Góc tự nhiên, toàn thân hoặc bán thân',
        prompt: 'ultra photorealistic Canon EOS R5 Mark II, Canon RF 50mm f/1.2L USM at f/1.2, ISO 100, Canon color science with natural warm-pink skin rendering, natural 50mm perspective, creamy bokeh separation',
    },
    {
        id: 'nikon_z8_85mm',
        name: '📷 Nikon Z8 + 85mm f/1.2',
        description: 'Tông ấm nhẹ, highlight mềm',
        prompt: 'ultra photorealistic Nikon Z8 45.7MP, Nikon Z 85mm f/1.2 S at f/1.2, ISO 100, Nikon EXPEED 7 color science with natural warm skin tones, tack-sharp autofocus on eyes, smooth defocused background',
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAKEUP STYLES — Trending trên TikTok/Douyin
// ═══════════════════════════════════════════════════════════════════════════════
export const MAKEUP_STYLES = [
    {
        id: 'auto',
        name: '🤖 Auto',
        prompt: '',
    },
    {
        id: 'clean_minimal',
        name: '✨ Clean Minimal',
        description: 'Trang điểm gần như không, da tự nhiên',
        prompt: 'clean minimal makeup — flawless skin base with healthy satin finish, barely visible hint of soft pink on cheekbones like natural flush, lips natural rosy-pink with subtle gloss, very light neutral shimmer on lids, thin brown liner, natural wispy lashes, clean defined eyebrows. Overall: looks like she is wearing almost nothing but has naturally perfect features',
    },
    {
        id: 'babe_cute_doll',
        name: '🎀 Babe Cute Doll',
        description: 'Dễ thương, môi coral-pink, da dewy',
        prompt: 'babe cute doll makeup — ultra dewy glass skin base with natural healthy glow, very soft barely-there natural pink warmth on round cheeks like genuine shy blushing, vivid fresh coral-pink juicy glossy lips — cute and lively with wet sheen, lightest pink-champagne shimmer on lids, minimal thin brown line, soft curled wispy natural lashes, fluffy natural warm-brown eyebrows. Overall: "no makeup makeup" look, naturally blessed with perfect features',
    },
    {
        id: 'douyin_cold_beauty',
        name: '❄️ Douyin Cold Beauty',
        description: 'Sang lạnh, môi đỏ cam, mắt sắc',
        prompt: 'douyin cold beauty makeup — flawless semi-matte porcelain base with controlled dewy glow on cheekbone peaks only, very subtle natural warmth on cheekbones from lighting only, RICH BURNT ORANGE-RED lips with full coverage satin-glossy finish — lips are the dominant color accent, thin precise dark brown-black liner tight against upper lashline with tiny subtle flick, natural medium-length softly curled wispy lashes, straight-to-soft-arch dark brown-black brows. Overall: elegant sharp sophisticated',
    },
    {
        id: 'korean_glass',
        name: '🫧 Korean Glass Skin',
        description: 'Da bóng gương, tươi tắn',
        prompt: 'korean glass skin makeup — ultra dewy luminous base with visible glass-like moisture sheen on entire face, cheeks nose bridge and chin all glowing with healthy dewy finish, soft warm pink cream blush barely visible on cheeks, MLBB (my lips but better) natural pink-mauve lip tint with glossy finish, wash of soft pink shimmer across lids, barely-there brown liner, natural curled lashes, soft natural brows. Overall: skin is the star — it glows',
    },
    {
        id: 'peach_blush_doll',
        name: '🍑 Peach Blush Doll',
        description: 'Đào nhẹ trên má, tươi như búp bê',
        prompt: 'peach blush doll makeup — flawless satin base, small concentrated touch of soft peach-coral powder blush ONLY on top of both cheekbones — tiny area NOT spread across face, fresh coral-peach gradient lips with natural juicy gloss, warm pink-champagne shimmer on lids, thin brown liner, soft wispy lashes, natural fluffy brows. Overall: fresh and cute with controlled peach accent',
    },
    {
        id: 'strawberry_girl',
        name: '🍓 Strawberry Girl',
        description: 'Hồng berry, tươi trẻ',
        prompt: 'strawberry girl makeup — dewy fresh base with natural glow, soft berry-pink flush on cheeks creating youthful rosy look, vivid berry-pink stained lips — gradient from rich berry center to soft pink edges, sparkly rose-pink shimmer on lids, soft brown liner, fluttery natural lashes, soft slightly messy brows. Overall: fresh fruity youthful and sweet',
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// SKIN PRESETS — Da trắng là chủ đạo
// ═══════════════════════════════════════════════════════════════════════════════
export const SKIN_PRESETS = [
    {
        id: 'auto',
        name: '🤖 Auto',
        prompt: '',
    },
    {
        id: 'porcelain_milky',
        name: '🥛 Da trắng sữa Milky',
        description: 'Trắng sáng, sống động, mặc định KOL',
        prompt: 'fair milk-white skin, cool pink undertone, brightness 87/100 — bright milky white with warm healthy youthful living quality. Skin looks fresh and healthy NOT bleached or dead. Very subtle natural rosy warmth on cheeks only. ALL exposed skin matching fair white: face neck chest shoulders arms. NO yellow NO tan NO orange. Fine micro skin texture: barely-visible pores on nose and inner cheeks, soft peach fuzz on jawline catching light, tiny beauty mark for authenticity, natural dewy moisture on cheekbone peaks and nose tip',
    },
    {
        id: 'porcelain_cool',
        name: '🧊 Da sứ Porcelain Cool',
        description: 'Trắng lạnh kiểu Hàn, elegant',
        prompt: 'bright fair porcelain skin, neutral white with NO warm tint, brightness 88/100. Skin clean bright white like porcelain ceramic. The ONLY color comes from lips and the tiniest natural warmth on cheekbone peaks where light hits — NOT blush, just natural light interaction with bone structure. Face reads as WHITE skin plus lip color only. NO yellow NO peach spread NO pink spread. Fine micro skin texture: natural skin grain across forehead, barely-visible pores in T-zone, ultra-fine peach fuzz on jawline, tiny beauty mark, subsurface scattering on ear rims',
    },
    {
        id: 'bright_pink',
        name: '🌸 Da trắng hồng',
        description: 'Trắng với undertone hồng nhẹ',
        prompt: 'bright fair white skin with subtle cool pink undertone throughout, brightness 86/100. Skin appears luminous white-pink, healthy and alive. Natural pink flush visible especially on cheeks ears and fingertips. Visible natural skin texture with fine pores, peach fuzz, and realistic micro-detail. NO yellow NO warm golden',
    },
    {
        id: 'natural_warm',
        name: '☀️ Da trắng ấm tự nhiên',
        description: 'Trắng với chút ấm peach rất nhẹ',
        prompt: 'bright fair skin with very slight warm peach undertone giving face LIFE and HEALTH, brightness 85/100. Overall reading is fair white but ALIVE with the tiniest whisper of warm peach — separating alive beautiful from dead pale. NO yellow NO orange. Natural skin texture with visible micro-detail for realism',
    },
    {
        id: 'honey_glow',
        name: '🍯 Da mật ong sáng',
        description: 'Sáng ấm, healthy, cho bối cảnh outdoor',
        prompt: 'bright honey-toned skin with warm golden undertone, brightness 80/100. Skin glows with natural warm healthy radiance. Smooth even tone with natural variation. Visible skin texture with fine pores and realistic detail',
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// KOL COMBOS — Quick-select áp dụng cả Camera + Skin + Makeup cùng lúc
// ═══════════════════════════════════════════════════════════════════════════════
export const KOL_COMBOS = [
    {
        id: 'combo2_cold_beauty',
        name: '❄️ Combo 2 — Cold Beauty Goddess',
        description: 'Sony 135mm + V-line + Douyin Cold Beauty — Sang lạnh, thời trang cao cấp',
        cameraId: 'sony_a7rv_135mm',
        skinId: 'porcelain_cool',
        makeupId: 'douyin_cold_beauty',
        recommended: 'Đồ đen, sexy, thời trang sang, luxury',
        emoji: '❄️',
    },
    {
        id: 'combo4_babe_cute',
        name: '🎀 Combo 4 — Babe Cute',
        description: 'Canon 85mm + Round face + Doll Makeup — Dễ thương, gần gũi',
        cameraId: 'canon_r5ii_85mm',
        skinId: 'porcelain_milky',
        makeupId: 'babe_cute_doll',
        recommended: 'Đồ casual, cute, homewear, daily, đồ hồng/trắng',
        emoji: '🎀',
    },
    {
        id: 'combo_peach_canon',
        name: '🍑 Combo Peach Canon',
        description: 'Canon 85mm + Da milky + Peach Blush — Tươi tắn, friendly',
        cameraId: 'canon_r5ii_85mm',
        skinId: 'porcelain_milky',
        makeupId: 'peach_blush_doll',
        recommended: 'Thời trang trẻ, review sản phẩm, vlog style',
        emoji: '🍑',
    },
    {
        id: 'combo_glass_sony',
        name: '🫧 Combo Glass Sony',
        description: 'Sony 135mm + Glass Skin + Clean — Tự nhiên cao cấp',
        cameraId: 'sony_a7rv_135mm',
        skinId: 'porcelain_milky',
        makeupId: 'korean_glass',
        recommended: 'Skincare, beauty campaign, editorial clean',
        emoji: '🫧',
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTING PRESETS — Chỉ dùng cool/neutral cho da trắng
// ═══════════════════════════════════════════════════════════════════════════════
export const LIGHTING_PRESETS = [
    { id: 'auto', name: '🤖 Auto', prompt: '' },
    {
        id: 'studio_cool',
        name: '💡 Studio Cool White',
        prompt: 'professional studio, large softbox from front-above, cool white 6000K neutral light, fill panel reducing harsh shadows, subtle rim light on hair from behind, light calibrated to keep skin reading as bright white',
    },
    {
        id: 'ring_light',
        name: '💡 Ring Light Beauty',
        prompt: 'soft even beauty lighting, ring light style with cool neutral fill 5800K creating flattering near-shadowless illumination, circular catchlight visible in both eyes, soft fill eliminating all harsh shadows',
    },
    {
        id: 'soft_daylight',
        name: '💡 Soft Daylight Indoor',
        prompt: 'soft indoor natural light from large window, cool neutral daylight 5600K, gentle directional light creating subtle face dimension, fill from white walls, light keeping skin bright white-pink',
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG — Mặc định khi user chưa chọn gì
// ═══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_KOL_CONFIG = {
    cameraPreset: 'canon_r5ii_85mm',
    skinPreset: 'porcelain_milky',
    makeupStyle: 'babe_cute_doll',
    lightingPreset: 'auto',
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Tìm preset theo ID */
export function findPreset(list, id) {
    return list.find(p => p.id === id) || list[0]
}

/** Áp dụng KOL combo → auto-fill camera/skin/makeup */
export function applyCombo(comboId) {
    const combo = KOL_COMBOS.find(c => c.id === comboId)
    if (!combo) return null
    return {
        cameraPreset: combo.cameraId,
        skinPreset: combo.skinId,
        makeupStyle: combo.makeupId,
    }
}

/**
 * Build complete KOL skin/camera/makeup prompt segment
 * from selected presets. Được inject vào master prompt.
 */
export function buildKolPromptSegment({ cameraPreset, skinPreset, makeupStyle, lightingPreset } = {}) {
    const camera = findPreset(CAMERA_PRESETS, cameraPreset)
    const skin = findPreset(SKIN_PRESETS, skinPreset)
    const makeup = findPreset(MAKEUP_STYLES, makeupStyle)
    const lighting = findPreset(LIGHTING_PRESETS, lightingPreset)

    const parts = []

    if (camera.prompt) parts.push(camera.prompt)
    if (skin.prompt) parts.push(`\nskin: ${skin.prompt}`)
    if (makeup.prompt) parts.push(`\nmakeup: ${makeup.prompt}`)
    if (lighting.prompt) parts.push(`\nlighting: ${lighting.prompt}`)

    return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPAT — Export flat arrays for dropdown/pill UI
// ═══════════════════════════════════════════════════════════════════════════════
export const SKIN_FILTERS_V2 = SKIN_PRESETS.map(p => p.name)
export const CAMERA_FILTERS = CAMERA_PRESETS.map(p => p.name)
export const MAKEUP_FILTERS = MAKEUP_STYLES.map(p => p.name)
export const COMBO_FILTERS = KOL_COMBOS.map(c => c.name)
