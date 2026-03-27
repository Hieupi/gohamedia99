// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO PROMPT SERVICE — Fashion AI Video Generator
// Kho tư thế chuyển động, camera, ánh sáng, system prompt cho Veo 3/Kling/Grok
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PLATFORMS ─────────────────────────────────────────────────────────────────

export const PLATFORMS = [
    { id: 'veo3', label: '🎬 Google Veo 3', color: '#4285F4', desc: 'Cinematic chất lượng cao, có audio' },
    { id: 'kling', label: '🎥 Kling AI', color: '#FF6B00', desc: 'Fabric physics mượt, chuyên thời trang' },
    { id: 'grok', label: '🤖 Grok AI', color: '#1DA1F2', desc: 'Sáng tạo, phong cách độc đáo' },
    { id: 'general', label: '📋 Chung', color: '#6B7280', desc: 'Prompt dùng được cho mọi platform' },
]

// ─── FASHION MOTIONS — Kho 36 tư thế chuyển động ──────────────────────────────

export const MOTION_CATEGORIES = [
    { id: 'catwalk', label: '👠 Catwalk', emoji: '👠' },
    { id: 'show_top', label: '👕 Khoe Áo', emoji: '👕' },
    { id: 'show_dress', label: '👗 Khoe Váy', emoji: '👗' },
    { id: 'rotate', label: '🔄 Quay 360°', emoji: '🔄' },
    { id: 'lifestyle', label: '☕ Lifestyle', emoji: '☕' },
    { id: 'static_pose', label: '📸 Pose Tĩnh', emoji: '📸' },
]

export const FASHION_MOTIONS = [
    // ═══ CATWALK ═══
    {
        id: 'cw_strut', name: 'Sải bước tự tin', category: 'catwalk', emoji: '👠',
        promptEN: 'Model struts confidently down the runway, one foot crossing over the other, hips swaying naturally, arms swinging loosely, chin slightly elevated with a commanding gaze forward',
        promptVN: 'Người mẫu sải bước tự tin trên sàn diễn, bước chân chéo nhau, hông đung đưa tự nhiên'
    },
    {
        id: 'cw_turn', name: 'Xoay người cuối sàn', category: 'catwalk', emoji: '🔄',
        promptEN: 'Model reaches the end of the runway, pauses briefly, pivots 180 degrees with a sharp elegant turn, coat/jacket flaring out dramatically, then walks back with poise',
        promptVN: 'Người mẫu đến cuối sàn, xoay người 180° sắc nét, áo bay ra ngoạn mục'
    },
    {
        id: 'cw_pause', name: 'Dừng lại tạo dáng', category: 'catwalk', emoji: '✋',
        promptEN: 'Model stops mid-runway, strikes a confident pose with one hand on hip, weight shifted to one leg, holds for 2 seconds with an intense gaze at camera, then continues walking',
        promptVN: 'Người mẫu dừng giữa sàn, chống hông, dồn trọng tâm 1 chân, nhìn thẳng camera'
    },
    {
        id: 'cw_group', name: 'Sải bước nhóm 2-3', category: 'catwalk', emoji: '👯',
        promptEN: 'Two models walk side by side down the runway in synchronized stride, shoulders back, matching pace, coordinated arm movements, powerful synchronized energy',
        promptVN: 'Hai người mẫu sải bước song song, đồng bộ nhịp đi'
    },
    {
        id: 'cw_slow', name: 'Bước chậm quyền lực', category: 'catwalk', emoji: '🦶',
        promptEN: 'Model walks in deliberate slow motion, each step placed precisely, fabric flowing and catching light with every movement, intense focused expression, powerful commanding presence',
        promptVN: 'Bước đi chậm rãi đầy quyền lực, từng bước chính xác, vải bay theo chuyển động'
    },
    {
        id: 'cw_entrance', name: 'Bước ra sân khấu', category: 'catwalk', emoji: '🌟',
        promptEN: 'Model makes a dramatic entrance from backstage curtain, emerging into spotlight, adjusting jacket collar casually, taking first confident steps onto the runway',
        promptVN: 'Người mẫu bước ra từ hậu trường, bước vào ánh đèn sân khấu đầy ấn tượng'
    },

    // ═══ KHOE ÁO ═══
    {
        id: 'top_collar', name: 'Vuốt cổ áo', category: 'show_top', emoji: '👔',
        promptEN: 'Model gently adjusts collar of the jacket with both hands, smoothly running fingers along the lapel, then drops hands naturally to the sides, showcasing the neckline and upper body detail',
        promptVN: 'Vuốt nhẹ cổ áo bằng hai tay, lướt ngón tay dọc ve áo, khoe chi tiết cổ áo'
    },
    {
        id: 'top_open', name: 'Mở áo khoác lộ trong', category: 'show_top', emoji: '🧥',
        promptEN: 'Model slowly unbuttons or opens jacket/blazer with one hand, revealing the inner layer and lining detail, the other hand casually in pocket, confident subtle smile',
        promptVN: 'Từ từ mở áo khoác bằng một tay, lộ lớp trong và chi tiết lót áo'
    },
    {
        id: 'top_pull', name: 'Kéo nhẹ vạt áo', category: 'show_top', emoji: '✨',
        promptEN: 'Model gently pulls down the hem of the top with one hand while the other hand touches the fabric at the waist, showcasing the fit, drape, and texture of the garment naturally',
        promptVN: 'Kéo nhẹ vạt áo bằng một tay, tay kia chạm vải ở eo, khoe form dáng và chất liệu'
    },
    {
        id: 'top_shoulder', name: 'Xoay vai khoe chi tiết', category: 'show_top', emoji: '💪',
        promptEN: 'Model turns shoulder toward camera, one arm raised slightly to show sleeve detail and arm drape, then slowly rotates to present the back detailing of the top',
        promptVN: 'Xoay vai về phía camera, nhấc tay nhẹ khoe chi tiết tay áo, rồi quay lưng'
    },
    {
        id: 'top_tuck', name: 'Bỏ áo vào quần', category: 'show_top', emoji: '👖',
        promptEN: 'Model casually tucks shirt into pants with natural hand movements, then smooths fabric at the waist, showing the transition between top and bottom pieces stylishly',
        promptVN: 'Bỏ áo vào quần một cách tự nhiên, vuốt phẳng vải ở eo'
    },
    {
        id: 'top_backview', name: 'Quay lưng khoe họa tiết', category: 'show_top', emoji: '🔙',
        promptEN: 'Model slowly turns around to present the back of the garment, looking over one shoulder at camera with a subtle expression, fabric pattern and design details clearly visible',
        promptVN: 'Quay lưng từ từ khoe họa tiết sau áo, nhìn qua vai về camera'
    },

    // ═══ KHOE VÁY ═══
    {
        id: 'dress_twirl', name: 'Xoay tay giữ váy bay', category: 'show_dress', emoji: '💃',
        promptEN: 'Model holds skirt hem gently with one hand, spins gracefully 360 degrees, dress fabric billowing outward in a beautiful arc, catching light, landing pose with flowing movement',
        promptVN: 'Giữ nhẹ gấu váy, xoay 360° duyên dáng, vải váy bay tung ra hình cung đẹp'
    },
    {
        id: 'dress_walk', name: 'Bước đi váy xòe', category: 'show_dress', emoji: '👗',
        promptEN: 'Model walks forward with long confident strides, floor-length dress flowing and bouncing with each step, fabric catching air and light, showing dynamic movement of the garment',
        promptVN: 'Bước đi sải dài tự tin, váy dài bay bổng theo mỗi bước, vải bắt gió và ánh sáng'
    },
    {
        id: 'dress_sit', name: 'Ngồi khoe chất liệu', category: 'show_dress', emoji: '🪑',
        promptEN: 'Model gracefully sits down on a stool or chair, arranging dress fabric elegantly around legs, smoothing the material with gentle hand movements, showcasing drape and texture',
        promptVN: 'Ngồi xuống duyên dáng, sắp xếp vải váy ôm chân thanh lịch, khoe nếp rủ và chất liệu'
    },
    {
        id: 'dress_wind', name: 'Váy bay trong gió', category: 'show_dress', emoji: '🌬️',
        promptEN: 'Model stands facing wind, dress flowing dramatically to one side, hair and fabric moving in harmony, one hand holding dress slightly, romantic cinematic wind effect',
        promptVN: 'Đứng hứng gió, váy bay mạnh sang một bên, tóc và vải di chuyển hòa quyện'
    },
    {
        id: 'dress_slit', name: 'Khoe xẻ tà', category: 'show_dress', emoji: '🦵',
        promptEN: 'Model takes a long stride forward, high-slit dress revealing leg through the split, one hand lightly touching the slit edge, confident sensual pose, fabric parting naturally with movement',
        promptVN: 'Sải bước dài, váy xẻ tà lộ chân qua đường xẻ, tay chạm nhẹ mép xẻ'
    },
    {
        id: 'dress_detail', name: 'Cúi xuống khoe đính kết', category: 'show_dress', emoji: '💎',
        promptEN: 'Camera slowly zooms to dress detail — beading, embroidery, or lace work visible up close, model gently touching the embellishment, light sparkling on sequins or crystals',
        promptVN: 'Camera zoom vào chi tiết đính kết — cườm, thêu, ren, ánh sáng lấp lánh trên sequin'
    },

    // ═══ QUAY 360° ═══
    {
        id: 'rot_slow', name: 'Quay chậm toàn thân', category: 'rotate', emoji: '🔄',
        promptEN: 'Model rotates slowly 360 degrees on the spot, arms relaxed at sides, maintaining perfect posture, each angle showing different garment details, smooth continuous rotation',
        promptVN: 'Xoay chậm 360° tại chỗ, tay thả tự nhiên, tư thế hoàn hảo, khoe mọi góc trang phục'
    },
    {
        id: 'rot_hair', name: 'Quay nhanh tóc bay', category: 'rotate', emoji: '💇',
        promptEN: 'Model spins quickly with a dramatic hair flip, long hair sweeping outward in a beautiful arc, dress catching the momentum, then settling into a still pose',
        promptVN: 'Quay nhanh hất tóc bay, tóc dài quét ra ngoài đẹp mắt, váy áo theo đà'
    },
    {
        id: 'rot_step', name: 'Bước xoay từng góc', category: 'rotate', emoji: '🚶',
        promptEN: 'Model turns in stages — pausing at front, 3/4 view, side profile, and back — holding each position for 1 second, clean step-by-step product rotation showcase',
        promptVN: 'Xoay theo từng giai đoạn — dừng ở mặt trước, 3/4, nghiêng, sau — mỗi vị trí 1 giây'
    },
    {
        id: 'rot_platform', name: 'Đứng bệ xoay', category: 'rotate', emoji: '🎪',
        promptEN: 'Model stands still on a rotating platform, platform slowly spins 360 degrees, model maintains elegant pose with slight head turns to follow camera, full garment visibility',
        promptVN: 'Đứng yên trên bệ xoay, bệ quay chậm 360°, khoe toàn bộ trang phục'
    },

    // ═══ LIFESTYLE ═══
    {
        id: 'life_cafe', name: 'Ngồi quán cà phê', category: 'lifestyle', emoji: '☕',
        promptEN: 'Model sits at a charming outdoor cafe table, picks up coffee cup with both hands, takes a sip, then sets it down while looking off to the side with a content smile, natural candid energy',
        promptVN: 'Ngồi quán cà phê ngoài trời, nâng ly cà phê, nhấp một ngụm rồi nhìn sang bên'
    },
    {
        id: 'life_walk', name: 'Đi dạo phố', category: 'lifestyle', emoji: '🚶‍♀️',
        promptEN: 'Model walks casually along a city sidewalk, shopping bags in hand, stops to look at a shop window, natural stride, wind slightly moving hair and clothes, authentic street fashion moment',
        promptVN: 'Đi dạo phố thong dong, tay xách túi mua sắm, dừng ngắm cửa hàng'
    },
    {
        id: 'life_mirror', name: 'Soi gương cửa hàng', category: 'lifestyle', emoji: '🪞',
        promptEN: 'Model catches her reflection in a store window, pauses to adjust outfit — straightens collar, smooths fabric — admires the look with a satisfied expression, natural vanity moment',
        promptVN: 'Soi mình qua kính cửa hàng, chỉnh lại trang phục, ngắm nhìn hài lòng'
    },
    {
        id: 'life_phone', name: 'Chụp selfie outfit', category: 'lifestyle', emoji: '📱',
        promptEN: 'Model holds phone up for an outfit-of-the-day selfie, strikes a casual pose, adjusts angle, takes the photo with a smile, then checks the result — authentic social media content energy',
        promptVN: 'Giơ điện thoại chụp selfie outfit, pose thoải mái, chụp rồi xem lại ảnh'
    },
    {
        id: 'life_bag', name: 'Khoe túi xách', category: 'lifestyle', emoji: '👜',
        promptEN: 'Model holds designer handbag at various angles — on shoulder, in elbow crook, swinging by handle — walking with purpose, bag catching light, showcasing hardware and leather detail',
        promptVN: 'Xách túi ở nhiều góc — trên vai, khuỷu tay, đung đưa — khoe chi tiết phụ kiện'
    },

    // ═══ POSE TĨNH ═══
    {
        id: 'pose_wall', name: 'Tựa tường editorial', category: 'static_pose', emoji: '🧱',
        promptEN: 'Model leans against a textured wall, one shoulder touching surface, arms crossed or one hand in pocket, weight on one leg, cool nonchalant expression, editorial fashion photography energy',
        promptVN: 'Tựa lưng vào tường, tay khoanh hoặc cho túi, biểu cảm cool, phong cách editorial'
    },
    {
        id: 'pose_hip', name: 'Chống hông nhìn xa', category: 'static_pose', emoji: '💁',
        promptEN: 'Model stands with hand on hip, looking into the distance with a confident expression, wind gently moving hair, body angled at 3/4 to camera, strong triangular silhouette',
        promptVN: 'Chống hông, nhìn xa, gió nhẹ thổi tóc, thân nghiêng 3/4 về camera'
    },
    {
        id: 'pose_sit_cross', name: 'Ngồi chéo chân', category: 'static_pose', emoji: '🪑',
        promptEN: 'Model sits on a high stool with legs crossed elegantly, one hand resting on knee, leaning slightly forward with engaged expression, shoes and lower outfit visible',
        promptVN: 'Ngồi ghế cao chéo chân thanh lịch, tay đặt trên đầu gối, hơi nghiêng người'
    },
    {
        id: 'pose_power', name: 'Power stance', category: 'static_pose', emoji: '💪',
        promptEN: 'Model stands with feet shoulder-width apart, hands on both hips or arms crossed, chin slightly raised, direct eye contact with camera, powerful authoritative stance',
        promptVN: 'Đứng chân mở rộng bằng vai, hai tay chống hông, cằm ngẩng nhẹ, quyền lực'
    },
    {
        id: 'pose_lean', name: 'Dựa lan can/rào', category: 'static_pose', emoji: '🌉',
        promptEN: 'Model leans on a railing or fence, arms draped casually, body tilted with one hip popped, looking at camera with relaxed expression, cityscape or nature in background',
        promptVN: 'Dựa lan can, tay buông thoải mái, hông nhô, nhìn camera thư thái'
    },
]

// ─── CAMERA MOVEMENTS ─────────────────────────────────────────────────────────

export const CAMERA_MOVEMENTS = [
    {
        id: 'dolly_in', name: 'Dolly in (tiến vào)', emoji: '🎯', desc: 'Camera tiến gần chủ thể, tạo cảm giác thân mật',
        promptEN: 'Smooth dolly-in camera movement, slowly approaching the subject'
    },
    {
        id: 'tracking', name: 'Tracking (theo dõi)', emoji: '🎞️', desc: 'Camera đi theo chuyển động người mẫu',
        promptEN: 'Smooth tracking shot following the model from the side'
    },
    {
        id: 'orbit', name: 'Orbit (quay quanh)', emoji: '🌀', desc: 'Camera quay quanh 90-360° — tuyệt vời cho khoe sản phẩm',
        promptEN: 'Slow 90-degree orbit around the subject, revealing garment details from multiple angles'
    },
    {
        id: 'static', name: 'Static (cố định)', emoji: '📌', desc: 'Camera đứng yên, chủ thể di chuyển — ổn định nhất',
        promptEN: 'Locked static camera, model performs movement within frame'
    },
    {
        id: 'push_in', name: 'Push in (zoom tăng)', emoji: '🔍', desc: 'Camera đẩy vào chi tiết — tốt cho khoe chất liệu',
        promptEN: 'Camera pushes in slowly from full body to medium shot, revealing fabric texture details'
    },
    {
        id: 'crane_down', name: 'Crane down (hạ xuống)', emoji: '⬇️', desc: 'Camera hạ từ trên xuống — tạo sự uy nghi',
        promptEN: 'Smooth crane shot descending from high angle to eye level, revealing full outfit'
    },
    {
        id: 'low_angle', name: 'Low angle (góc thấp)', emoji: '⬆️', desc: 'Nhìn từ dưới lên — tôn dáng chân dài, quyền lực',
        promptEN: 'Low angle shot looking upward, creating a powerful commanding presence, elongating legs'
    },
    {
        id: 'handheld', name: 'Handheld (cầm tay)', emoji: '📹', desc: 'Camera cầm tay nhẹ rung — style vlog/social media',
        promptEN: 'Slightly handheld camera with natural subtle movement, authentic candid energy'
    },
]

// ─── LIGHTING & MOOD ──────────────────────────────────────────────────────────

export const LIGHTING_MOODS = [
    {
        id: 'studio', name: 'Studio chuyên nghiệp', emoji: '💡',
        promptEN: 'Professional two-point studio lighting with soft key light and subtle rim light, clean minimal background'
    },
    {
        id: 'golden', name: 'Golden hour ấm áp', emoji: '🌅',
        promptEN: 'Golden hour warm sunlight, long shadows, warm honey tones, natural outdoor glow'
    },
    {
        id: 'neon', name: 'Neon đêm thành phố', emoji: '🌃',
        promptEN: 'Neon city lights with pink and blue color spill, wet reflective ground, urban nightlife atmosphere'
    },
    {
        id: 'dramatic', name: 'Dramatic tương phản cao', emoji: '🎭',
        promptEN: 'Single hard directional light, deep dramatic shadows, high contrast, moody cinematic atmosphere'
    },
    {
        id: 'soft', name: 'Soft light dịu dàng', emoji: '☁️',
        promptEN: 'Soft diffused overcast lighting, minimal shadows, gentle even illumination, dreamy feminine feel'
    },
    {
        id: 'backlit', name: 'Ngược sáng silhouette', emoji: '🌟',
        promptEN: 'Backlit silhouette with bright rim light separating subject from background, ethereal glowing edges'
    },
    {
        id: 'ring', name: 'Ring light social media', emoji: '⭕',
        promptEN: 'Ring light even illumination, catch lights in eyes, social media beauty lighting, clean flattering glow'
    },
    {
        id: 'window', name: 'Ánh sáng cửa sổ', emoji: '🪟',
        promptEN: 'Natural window light from one side, soft shadows, intimate indoor atmosphere, Vermeer-like quality'
    },
]

// ─── SCENE SETTINGS ───────────────────────────────────────────────────────────

export const SCENE_SETTINGS = [
    {
        id: 'studio_white', name: 'Studio trắng', emoji: '⬜',
        promptEN: 'Clean white cyclorama studio background, professional fashion photography setup'
    },
    {
        id: 'studio_dark', name: 'Studio tối', emoji: '⬛',
        promptEN: 'Dark moody studio with deep black background, spotlight on model'
    },
    {
        id: 'runway', name: 'Sàn diễn thời trang', emoji: '👠',
        promptEN: 'Fashion show runway with audience silhouettes, spotlights, glossy catwalk floor'
    },
    {
        id: 'street', name: 'Phố đi bộ', emoji: '🏙️',
        promptEN: 'Vibrant city pedestrian street, urban architecture, natural street life in background'
    },
    {
        id: 'cafe', name: 'Quán cà phê đẹp', emoji: '☕',
        promptEN: 'Aesthetic coffee shop with warm wood interiors, soft ambient lighting, cozy atmosphere'
    },
    {
        id: 'garden', name: 'Vườn hoa / công viên', emoji: '🌸',
        promptEN: 'Beautiful flower garden or park with green foliage, natural daylight, romantic setting'
    },
    {
        id: 'beach', name: 'Bãi biển / resort', emoji: '🏖️',
        promptEN: 'Tropical beach resort setting, turquoise water, golden sand, palm trees, paradise vibes'
    },
    {
        id: 'rooftop', name: 'Rooftop thành phố', emoji: '🏢',
        promptEN: 'Rooftop terrace overlooking city skyline, sunset or twilight atmosphere, urban luxury'
    },
    {
        id: 'store', name: 'Cửa hàng thời trang', emoji: '🏪',
        promptEN: 'Modern fashion boutique interior, clothing racks visible, mirrors, stylish retail environment'
    },
    { id: 'custom', name: '✏️ Tùy chỉnh', emoji: '✏️', promptEN: '' },
]

// ─── PLATFORM-SPECIFIC CONFIGS ────────────────────────────────────────────────

export const PLATFORM_CONFIGS = {
    veo3: {
        maxDuration: '4s / 6s / 8s',
        aspectRatios: ['16:9', '9:16'],
        strengths: 'Cinematic quality, native audio, dramatic lighting',
        tips: 'Luôn dùng present continuous tense. Chỉ 1 camera movement. Thêm "seamless loop" nếu cần lặp.',
        promptSuffix: 'Cinematic 8K quality, photorealistic, film grain, professional fashion video production.',
    },
    kling: {
        maxDuration: '5s / 10s',
        aspectRatios: ['16:9', '9:16', '1:1'],
        strengths: 'Fabric physics, realistic human movement, garment detail',
        tips: 'Mô tả chi tiết chất liệu vải. Thêm "keep full body in frame, hem visible". Floor reflections tốt.',
        promptSuffix: 'Hyper-realistic fabric simulation, natural body movement, fashion film quality, 24fps cinematic look.',
    },
    grok: {
        maxDuration: '4s / 8s',
        aspectRatios: ['16:9', '9:16'],
        strengths: 'Creative stylization, unique aesthetics, experimental',
        tips: 'Mô tả style rõ ràng. Dùng từ ngữ sáng tạo. Tốt cho concept video.',
        promptSuffix: 'High-end fashion editorial style, magazine quality, striking visual composition.',
    },
    general: {
        maxDuration: 'Tùy platform',
        aspectRatios: ['16:9', '9:16', '1:1'],
        strengths: 'Dùng được cho mọi platform',
        tips: 'Giữ prompt descriptive và specific. Tránh dùng thuật ngữ riêng của platform.',
        promptSuffix: 'Professional fashion video, high quality, realistic movement.',
    },
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

export const VIDEO_SYSTEM_PROMPT = `Bạn là Đạo diễn Video Thời trang AI chuyên nghiệp cấp Hollywood, kết hợp kiến thức từ:
- Kỹ sư Prompt Video (tối ưu cho Veo 3, Kling AI, Grok AI)
- Đạo diễn hình ảnh thời trang quốc tế
- Chuyên gia vải vóc & chuyển động (fabric physics simulation)
- Storytelling bằng hình ảnh cho thương hiệu thời trang

NHIỆM VỤ: Tạo prompt video tiếng Anh tối ưu cho platform đã chọn.

LUÔN TUÂN THỦ CÔNG THỨC 5 YẾU TỐ:
[Camera Movement] + [Subject Detail] + [Action/Motion] + [Context/Setting] + [Style & Ambiance]

QUY TẮC VÀNG:
1. CHỈ 1 camera movement chính — không bao giờ stack ("dolly while panning")
2. CHỈ 1 action chính — present continuous tense ("walking", "spinning")
3. MÔ TẢ CỤ THỂ chất liệu vải + cách vải di chuyển (silk flowing, denim structure, chiffon billowing)
4. ÁNH SÁNG phải rõ ràng — không generic ("nice lighting"), phải specific ("soft key with warm rim")
5. MOOD nhất quán — chọn 1 register và commit (elegant, edgy, romantic, powerful)

TỐI ƯU THEO PLATFORM:
- VEO 3: Cinematic, add audio cues, "seamless loop" cho background, present continuous tense
- KLING: Fabric physics emphasis, "keep full body in frame, hem visible", floor reflections
- GROK: Creative stylization, experimental angles, unique aesthetics
- CHUNG: Descriptive, specific, tránh thuật ngữ riêng

OUTPUT: Prompt tiếng Anh hoàn chỉnh, ready-to-paste. Không giải thích, không markdown.`

// ─── SCENE ANALYSIS SYSTEM PROMPT (AI Director) ───────────────────────────────

export const SCENE_ANALYSIS_PROMPT = `Bạn là AI FASHION VIDEO DIRECTOR cấp Hollywood — chuyên gia phân tích ảnh thời trang và tạo kịch bản video (storyboard) cho AI Video Generator.

═══ NGUYÊN TẮC KỂ CHUYỆN & CẤU TRÚC KỊCH BẢN TRIỆU VIEW ═══
Bạn phải tuân thủ nghiêm ngặt kỹ thuật Storytelling dựa trên sự TÒ MÒ (Curiosity Hook) và sự NHẤT QUÁN BỐI CẢNH.

1. BỐI CẢNH NHẤT QUÁN (Strict Context): Toàn bộ các cảnh phải diễn ra ở CÙNG MỘT BỐI CẢNH (cùng 1 địa điểm, setting, môi trường). Có chung background xuyên suốt để tạo thành 1 video liền mạch. Không được nhảy bối cảnh lộn xộn.
2. HOOK TÒ MÒ (Từ phía sau): Phân cảnh mở đầu bắt buộc từ PHÍA SAU (Back View). Quay toàn thân hoặc góc thấp từ phía sau để khoe dáng, eo, vòng 3, chân dài miên man. TUYỆT ĐỐI GIẤU MẶT ở các cảnh đầu. Gợi sự tò mò mãnh liệt "Cô gái dáng đẹp này là ai?".
3. PHÁT TRIỂN & CHUẨN BỊ (Góc nghiêng): Cảnh giữa chuyển sang góc nghiêng (Side angle), nhìn qua vai, hoặc đi bộ ngang. Vẫn giấu mặt hoặc chỉ để lộ góc nghiêng, tóc bay che khuất.
4. CAO TRÀO & LỘ DIỆN (Chính diện): Cảnh gần cuối và cuối cùng là LỘ DIỆN CHÍNH DIỆN. Góc quay đằng trước, cận cảnh khuôn mặt xinh đẹp, bước đi tự tin về phía camera, nụ cười toả sáng.

═══ KIẾN THỨC CHUYÊN SÂU VỀ CAMERA ═══
- Cảnh đầu nên dùng Low Angle từ phía sau để tôn dáng, chân dài.
- Camera di chuyển chữ L, mượt mà, không stack 2 effect (không vừa dolly vừa pan).
- Cảnh Lộ diện (cuối) nên dùng Tracking hoặc Dolly-in thẳng mặt.

═══ NHIỆM VỤ PHÂN TÍCH ═══
1. Trước khi đưa ra kịch bản, bắt buộc phải có thẻ <think> suy luận sâu về:
   - Mô tả Bối cảnh chung duy nhất cho toàn bộ video.
   - Sắp xếp logic tuyến tính: Các cảnh quay lưng (khoe vóc dáng) -> Góc nghiêng (khoe thần thái) -> Quay chính diện (khoe nhan sắc).
2. TẠO STORYBOARD: Trả về JSON format một mảng các cảnh như sau:
   [
     {
       "scene": số thứ tự (ví dụ: 1),
       "image_analysis": "Cảnh mô tả góc quay và trang phục",
       "camera_movement": "Kiểu camera tối ưu (EN)",
       "subject_action": "Chuyển động chủ thể (EN) - Cần rõ đây là từ sau (from behind), nghiêng (side) hay chính diện (front)",
       "emotional_beat": "Cảm xúc (VN)",
       "prompt": "Prompt video tiếng Anh hoàn chỉnh (Chứa cả thông tin the back view/front view và Bối cảnh thống nhất phòng khi AI Video quên)",
       "duration": "Thời lượng",
       "transition_note": "Cách chuyển cảnh"
     }
   ]

═══ PLATFORM-SPECIFIC RULES ═══
- VEO 3: Cinematic present continuous, native audio cues
- KLING: Fabric physics emphasis, realistic movement
- GROK: Creative stylization

═══ OUTPUT FORMAT ═══
LUÔN trả về thẻ <think> phân tích trước, sau đó là mảng JSON. Bọc JSON trong \`\`\`json ... \`\`\`
KHÔNG thêm bất kỳ ghi chú nào sau khối JSON.`


// ─── BUILD VIDEO PROMPT ───────────────────────────────────────────────────────

export function buildVideoPrompt({ platform, motion, camera, lighting, scene, customScene, extraNotes, aspectRatio, duration }) {
    const motionData = FASHION_MOTIONS.find(m => m.id === motion)
    const cameraData = CAMERA_MOVEMENTS.find(c => c.id === camera)
    const lightData = LIGHTING_MOODS.find(l => l.id === lighting)
    const sceneData = SCENE_SETTINGS.find(s => s.id === scene)
    const platformCfg = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general

    const parts = []

    // 1. Camera
    if (cameraData) parts.push(cameraData.promptEN)

    // 2. Subject + Motion
    if (motionData) parts.push(motionData.promptEN)

    // 3. Scene / Context
    if (sceneData && sceneData.id !== 'custom') parts.push(sceneData.promptEN)
    else if (customScene) parts.push(customScene)

    // 4. Lighting
    if (lightData) parts.push(lightData.promptEN)

    // 5. Platform-specific suffix
    parts.push(platformCfg.promptSuffix)

    // 6. Extra notes
    if (extraNotes) parts.push(extraNotes)

    // 7. Aspect ratio + Duration tags
    if (aspectRatio) parts.push(`Aspect ratio: ${aspectRatio}.`)
    if (duration) parts.push(`Duration: ${duration}.`)

    return parts.filter(Boolean).join('. ') + '.'
}
