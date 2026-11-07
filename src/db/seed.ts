import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  users, channels, videos, posts, comments, likes, saves, follows, subscriptions,
  playlists, playlistItems, watchHistory, stories, storyViews, storyHighlights,
  conversations, conversationMembers, messages, notifications, liveStreams, liveMessages,
  reports, transactions, monetizationAccounts,
} from "./schema";

const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - (days * 24 + hours) * 3600 * 1000);
const future = (hours: number) => new Date(now + hours * 3600 * 1000);
const G = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

const IMG = {
  t1: "https://images.pexels.com/photos/37045294/pexels-photo-37045294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t2: "https://images.pexels.com/photos/8000591/pexels-photo-8000591.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t3: "https://images.pexels.com/photos/12712506/pexels-photo-12712506.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t4: "https://images.pexels.com/photos/39934763/pexels-photo-39934763.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t5: "https://images.pexels.com/photos/20885456/pexels-photo-20885456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t6: "https://images.pexels.com/photos/31918446/pexels-photo-31918446.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t7: "https://images.pexels.com/photos/39190676/pexels-photo-39190676.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  t8: "https://images.pexels.com/photos/17748635/pexels-photo-17748635.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr1: "https://images.pexels.com/photos/8713556/pexels-photo-8713556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr2: "https://images.pexels.com/photos/34408978/pexels-photo-34408978.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr3: "https://images.pexels.com/photos/25026852/pexels-photo-25026852.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr4: "https://images.pexels.com/photos/2324780/pexels-photo-2324780.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr5: "https://images.pexels.com/photos/35116729/pexels-photo-35116729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr6: "https://images.pexels.com/photos/12875096/pexels-photo-12875096.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr7: "https://images.pexels.com/photos/4762954/pexels-photo-4762954.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tr8: "https://images.pexels.com/photos/12521572/pexels-photo-12521572.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  cf1: "https://images.pexels.com/photos/4253132/pexels-photo-4253132.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  cf2: "https://images.pexels.com/photos/37261939/pexels-photo-37261939.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  cf3: "https://images.pexels.com/photos/4253293/pexels-photo-4253293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  cf4: "https://images.pexels.com/photos/4253709/pexels-photo-4253709.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  f1: "https://images.pexels.com/photos/31216533/pexels-photo-31216533.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
  f2: "https://images.pexels.com/photos/36106736/pexels-photo-36106736.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
  f3: "https://images.pexels.com/photos/28250752/pexels-photo-28250752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
  f4: "https://images.pexels.com/photos/35175519/pexels-photo-35175519.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
  f5: "https://images.pexels.com/photos/27133544/pexels-photo-27133544.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
};

const AVA = {
  nova: "https://randomuser.me/api/portraits/men/32.jpg",
  maya: "https://randomuser.me/api/portraits/women/68.jpg",
  elias: "https://randomuser.me/api/portraits/men/75.jpg",
  jade: "https://randomuser.me/api/portraits/women/65.jpg",
  alex: "https://randomuser.me/api/portraits/men/22.jpg",
  aria: "https://randomuser.me/api/portraits/women/44.jpg",
  prakash: "https://randomuser.me/api/portraits/men/85.jpg",
  lena: "https://randomuser.me/api/portraits/women/33.jpg",
  sam: "https://randomuser.me/api/portraits/men/41.jpg",
  admin: "https://randomuser.me/api/portraits/men/36.jpg",
  ivy: "https://randomuser.me/api/portraits/women/12.jpg",
  marco: "https://randomuser.me/api/portraits/men/59.jpg",
};

async function main() {
  console.log("→ Wiping existing data…");
  await db.execute(sql`TRUNCATE TABLE users, channels, videos, posts, comments, likes, saves, follows, subscriptions, blocks, playlists, playlist_items, watch_history, stories, story_views, story_highlights, conversations, conversation_members, messages, notifications, live_streams, live_messages, reports, transactions, monetization_accounts, audit_logs RESTART IDENTITY CASCADE`);

  const hash = await bcrypt.hash("password123", 10);

  console.log("→ Creating users…");
  const insertedUsers = await db.insert(users).values([
    { username: "novabytes", email: "nova@socialverse.app", passwordHash: hash, displayName: "Nova Bytes", bio: "Tech, desks & the gear worth your money. New videos every Tuesday and Friday.", avatarUrl: AVA.nova, bannerHue: "262", website: "https://novabytes.tv", location: "Austin, TX", verified: true, followersCount: 482_300 },
    { username: "maya.cucina", email: "maya@socialverse.app", passwordHash: hash, displayName: "Maya Calderón", bio: "Chef of 12 years. Pan sauces, pasta & the psychology of flavor. Cookbook dropping fall 2026.", avatarUrl: AVA.maya, bannerHue: "18", website: "https://mayacucina.com", location: "Mexico City", verified: true, followersCount: 1_204_800 },
    { username: "eliaswanders", email: "elias@socialverse.app", passwordHash: hash, displayName: "Elias Wander", bio: "Solo hiker & storyteller. 8 days in the Dolomites series — new episode this Sunday.", avatarUrl: AVA.elias, bannerHue: "152", website: "https://eliaswanders.com", location: "Dolomites, IT", verified: true, followersCount: 968_400 },
    { username: "jadekimfit", email: "jade@socialverse.app", passwordHash: hash, displayName: "Jade Kim", bio: "Strength coach. Evidence-based training, high-protein cooking, no gimmicks.", avatarUrl: AVA.jade, bannerHue: "330", website: "https://jadekimfit.com", location: "Los Angeles, CA", verified: true, followersCount: 1_570_900 },
    { username: "alexrivera", email: "demo@socialverse.app", passwordHash: hash, displayName: "Alex Rivera", bio: "Creator & weekend filmmaker. Travel, tech and everything in between.", avatarUrl: AVA.alex, bannerHue: "217", website: "https://alexrivera.studio", location: "Denver, CO", verified: false, followersCount: 12_480 },
    { username: "ariavale", email: "aria@socialverse.app", passwordHash: hash, displayName: "Aria Vale", bio: "Singer-songwriter. \"Midnight Static\" out now. Live studio sessions every other Saturday.", avatarUrl: AVA.aria, bannerHue: "280", website: "https://ariavale.music", location: "Nashville, TN", verified: true, followersCount: 2_310_000 },
    { username: "pixelprakash", email: "prakash@socialverse.app", passwordHash: hash, displayName: "PixelPrakash", bio: "Double XP. Mystery boxes, retro finds and the games nobody asked for.", avatarUrl: AVA.prakash, bannerHue: "42", website: "", location: "London, UK", verified: false, followersCount: 156_700 },
    { username: "lenatoren", email: "lena@socialverse.app", passwordHash: hash, displayName: "Lena Torres", bio: "Photographer chasing golden hour. Sony systems & Lightroom presets.", avatarUrl: AVA.lena, bannerHue: "12", website: "https://lenatoren.photo", location: "Barcelona, ES", verified: true, followersCount: 734_200 },
    { username: "samokafor", email: "sam@socialverse.app", passwordHash: hash, displayName: "Sam Okafor", bio: "Esports analyst. VCT breakdowns and clutch cinema every Monday.", avatarUrl: AVA.sam, bannerHue: "205", website: "", location: "Lagos, NG", verified: false, followersCount: 89_300 },
    { username: "socialverse", email: "admin@socialverse.app", passwordHash: hash, displayName: "SocialVerse Team", bio: "Official SocialVerse account. Platform news, creator spotlights and safety updates.", avatarUrl: AVA.admin, bannerHue: "250", website: "https://socialverse.app", location: "", verified: true, isAdmin: true, followersCount: 5_400_000 },
    { username: "ivychen", email: "ivy@socialverse.app", passwordHash: hash, displayName: "Ivy Chen", bio: "Science educator. The physics hiding inside everyday life — new shorts daily.", avatarUrl: AVA.ivy, bannerHue: "190", website: "https://ivychen.science", location: "Toronto, CA", verified: true, followersCount: 890_100 },
    { username: "marcoruizauto", email: "marco@socialverse.app", passwordHash: hash, displayName: "Marco Ruiz", bio: "Automotive engineer. Honest EV reviews, wiring nightmares and buyer's guides.", avatarUrl: AVA.marco, bannerHue: "24", website: "", location: "Monterrey, MX", verified: false, followersCount: 211_500 },
  ]).returning();
  const u = Object.fromEntries(insertedUsers.map((x) => [x.username, x]));

  console.log("→ Creating channels…");
  const insertedChannels = await db.insert(channels).values([
    { userId: u.novabytes.id, name: "Nova Bytes", handle: "@novabytes", description: "Tech, desks & the gear worth your money.", category: "Technology", subscriberCount: 812_400, totalViews: 96_400_000, monetized: true },
    { userId: u["maya.cucina"].id, name: "Maya Cocina", handle: "@mayacucina", description: "Pan sauces, pasta & the psychology of flavor.", category: "Cooking", subscriberCount: 1_980_000, totalViews: 210_700_000, monetized: true },
    { userId: u.eliaswanders.id, name: "Elias Wanders", handle: "@eliaswanders", description: "Solo hiking & storytelling from the world's ridgelines.", category: "Travel", subscriberCount: 1_430_000, totalViews: 154_200_000, monetized: true },
    { userId: u.jadekimfit.id, name: "Jade Kim Fitness", handle: "@jadekimfit", description: "Strength coaching without the gimmicks.", category: "Fitness", subscriberCount: 2_260_000, totalViews: 188_900_000, monetized: true },
    { userId: u.alexrivera.id, name: "Alex Rivera", handle: "@alexrivastava", description: "Travel, tech & filmmaking from the road.", category: "Travel", subscriberCount: 9_840, totalViews: 218_000, monetized: true },
    { userId: u.ariavale.id, name: "Aria Vale", handle: "@ariavale", description: "Singer-songwriter. Live sessions & songwriting breakdowns.", category: "Music", subscriberCount: 3_420_000, totalViews: 342_800_000, monetized: true },
    { userId: u.pixelprakash.id, name: "PixelPrakash", handle: "@pixelprakash", description: "Mystery boxes & retro finds.", category: "Gaming", subscriberCount: 240_300, totalViews: 41_600_000, monetized: true },
    { userId: u.lenatoren.id, name: "Lena Torres Photography", handle: "@lenatoren", description: "Golden hour, film simulations & Lightroom.", category: "Education", subscriberCount: 590_000, totalViews: 67_300_000, monetized: true },
    { userId: u.samokafor.id, name: "Sam Okafor Esports", handle: "@samokafor", description: "VCT breakdowns & clutch cinema.", category: "Gaming", subscriberCount: 102_100, totalViews: 12_900_000, monetized: false },
    { userId: u.socialverse.id, name: "SocialVerse", handle: "@socialverse", description: "Official SocialVerse channel.", category: "Education", subscriberCount: 8_900_000, totalViews: 510_000_000, monetized: false },
    { userId: u.ivychen.id, name: "Ivy Chen Science", handle: "@ivychen", description: "The physics inside everyday life.", category: "Education", subscriberCount: 1_120_000, totalViews: 145_000_000, monetized: true },
    { userId: u.marcoruizauto.id, name: "Marco Ruiz Auto", handle: "@marcoruizauto", description: "Honest EV reviews & buyer's guides.", category: "Automotive", subscriberCount: 305_800, totalViews: 38_400_000, monetized: true },
  ]).returning();
  const c = Object.fromEntries(insertedChannels.map((x) => [x.handle, x]));

  console.log("→ Creating videos…");
  const insertedVideos = await db.insert(videos).values([
    // Long-form
    { userId: u.novabytes.id, channelId: c["@novabytes"].id, kind: "long", title: "I Built the Ultimate 2026 Desk Setup (Full Tour)", description: "The complete tour of my rebuilt 2026 battlestation — monitor arm, mats, lighting, cable routing and the acoustic panels you actually need.\n\n0:00 Intro\n1:24 Desk & frame\n4:10 Monitor arm & panel fitment\n9:32 Cable management\n14:05 Lighting & acoustics\n18:20 Budget breakdown", videoUrl: `${G}/ForBiggerFun.mp4`, thumbnailUrl: IMG.t6, durationSec: 1099, views: 284_300, likesCount: 18_420, category: "Technology", tags: ["desksetup", "tech", "battlestation", "2026"], chapters: [{ time: 0, label: "Intro" }, { time: 84, label: "Desk & frame" }, { time: 250, label: "Monitor arm" }, { time: 572, label: "Cable management" }, { time: 845, label: "Lighting & acoustics" }], createdAt: ago(2, 5) },
    { userId: u.novabytes.id, channelId: c["@novabytes"].id, kind: "long", title: "The $12 Mic That Shames $400 Studio Gear", description: "I tested this budget condenser against four studio staples. The results are embarrassing — for the expensive ones.", videoUrl: `${G}/ForBiggerBlazes.mp4`, thumbnailUrl: IMG.t4, durationSec: 846, views: 512_700, likesCount: 27_910, commentsCount: 0, category: "Technology", tags: ["audio", "microphone", "budget"], createdAt: ago(9, 3) },
    { userId: u.eliaswanders.id, channelId: c["@eliaswanders"].id, kind: "long", title: "Solo Hiking the Dolomites — 8 Days, No Plan", description: "No itinerary, no car, no crowds. 8 days from Brixen to Cortina on foot with 12kg on my back. Full route GPX in the description.", videoUrl: `${G}/Sintel.mp4`, thumbnailUrl: IMG.tr5, durationSec: 1467, views: 698_100, likesCount: 41_500, category: "Travel", tags: ["dolomites", "hiking", "solo", "italy"], chapters: [{ time: 0, label: "Day 1 — Brixen" }, { time: 420, label: "Day 3 — Seceda" }, { time: 900, label: "Day 6 — Fuciade" }], createdAt: ago(5, 8) },
    { userId: u["maya.cucina"].id, channelId: c["@mayacucina"].id, kind: "long", title: "The Perfect Pan Sauce in 5 Minutes (Chef's Method)", description: "Fond, butter, mounting — the exact sequence professional kitchens use. Works on steak, chicken, mushrooms and almost everything.", videoUrl: `${G}/ElephantsDream.mp4`, thumbnailUrl: IMG.cf3, durationSec: 623, views: 891_400, likesCount: 52_300, category: "Cooking", tags: ["pansauce", "cooking", "cheftips"], createdAt: ago(4, 6) },
    { userId: u.jadekimfit.id, channelId: c["@jadekimfit"].id, kind: "long", title: "Why Your Leg Day Isn't Working (Science-Based Fix)", description: "Most lifters fail leg growth because of two correctable mistakes. Here's the hypertrophy evidence, the programming template, and the mistakes to stop making today.", videoUrl: `${G}/ForBiggerJoyrides.mp4`, thumbnailUrl: IMG.f2, durationSec: 1120, views: 1_240_000, likesCount: 68_200, category: "Fitness", tags: ["legday", "hypertrophy", "strength"], createdAt: ago(7, 2) },
    { userId: u.ivychen.id, channelId: c["@ivychen"].id, kind: "long", title: "The Math That Predicts Which Videos Go Viral", description: "Watch completion curves, rewatch spikes and the 3-second rule — explained with real data from 40,000 uploads.", videoUrl: `${G}/TearsOfSteel.mp4`, thumbnailUrl: IMG.t2, durationSec: 1290, views: 445_600, likesCount: 23_700, category: "Education", tags: ["algorithms", "youtube", "data"], createdAt: ago(11, 4) },
    { userId: u.pixelprakash.id, channelId: c["@pixelprakash"].id, kind: "long", title: "I Played EVERY Game From This Mystery Box", description: "A stranger sent me a box of 47 sealed games. Here's what happened.", videoUrl: `${G}/ForBiggerEscapes.mp4`, thumbnailUrl: IMG.t3, durationSec: 980, views: 233_800, likesCount: 15_400, category: "Gaming", tags: ["mysterybox", "retro", "games"], createdAt: ago(3, 9) },
    { userId: u.ariavale.id, channelId: c["@ariavale"].id, kind: "long", title: "Writing a Song in 24 Hours (Live Session)", description: "From a blank page to a finished demo in one day — lyrics, melody, chords and the vocal take. Watch the whole process.", videoUrl: `${G}/ForBiggerMeltdowns.mp4`, thumbnailUrl: IMG.t8, durationSec: 1534, views: 1_870_000, likesCount: 94_600, category: "Music", tags: ["songwriting", "studio", "livesession"], createdAt: ago(6, 7) },
    { userId: u.marcoruizauto.id, channelId: c["@marcoruizauto"].id, kind: "long", title: "2026 EVs: The Only 5 Worth Buying", description: "I drove 14 electric cars this year. These five survive the spreadsheet — range, charging, depreciation and the hidden costs nobody mentions.", videoUrl: `${G}/SubaruOutbackOnStreetAndDirt.mp4`, thumbnailUrl: IMG.tr1, durationSec: 1388, views: 322_500, likesCount: 12_900, category: "Automotive", tags: ["ev", "cars", "2026"], createdAt: ago(8, 5) },
    { userId: u.lenatoren.id, channelId: c["@lenatoren"].id, kind: "long", title: "Golden Hour Portraits: The Complete Field Guide", description: "Timing, positioning, exposure and one posing framework that works on every client. Shot on location in Barcelona.", videoUrl: `${G}/BigBuckBunny.mp4`, thumbnailUrl: IMG.tr6, durationSec: 1156, views: 187_200, likesCount: 13_800, category: "Education", tags: ["photography", "portraits", "goldenhour"], createdAt: ago(13, 6) },
    // Shorts
    { userId: u.novabytes.id, channelId: c["@novabytes"].id, kind: "short", title: "Cable management that actually survives daily use", description: "Three clips, two velcro wraps, zero regrets. #desksetup #tech", videoUrl: `${G}/ForBiggerBlazes.mp4`, thumbnailUrl: IMG.t6, durationSec: 47, views: 1_540_000, likesCount: 88_000, category: "Technology", tags: ["desksetup", "shorts"], audioTrack: "Original audio — Nova Bytes", createdAt: ago(1, 4) },
    { userId: u["maya.cucina"].id, channelId: c["@mayacucina"].id, kind: "short", title: "Dumpling folding in 40 seconds", description: "The pleat sequence my grandmother taught me. #cooking #dumplings", videoUrl: `${G}/ForBiggerFun.mp4`, thumbnailUrl: IMG.cf2, durationSec: 41, views: 3_210_000, likesCount: 142_000, category: "Cooking", tags: ["cooking", "shorts"], audioTrack: "Original audio — Maya Calderón", createdAt: ago(1, 9) },
    { userId: u.jadekimfit.id, channelId: c["@jadekimfit"].id, kind: "short", title: "One exercise. Zero excuses.", description: "Cossack squat progression — beginner to bulletproof. #fitness", videoUrl: `${G}/ForBiggerJoyrides.mp4`, thumbnailUrl: IMG.f3, durationSec: 52, views: 2_040_000, likesCount: 97_300, category: "Fitness", tags: ["fitness", "shorts"], audioTrack: "Phonk workout mix — DJ Pulse", createdAt: ago(2, 2) },
    { userId: u.eliaswanders.id, channelId: c["@eliaswanders"].id, kind: "short", title: "POV: first view of Seceda at sunrise", description: "Glockner sunrise on day 4. #dolomites #hiking", videoUrl: `${G}/ForBiggerEscapes.mp4`, thumbnailUrl: IMG.tr5, durationSec: 38, views: 2_780_000, likesCount: 131_000, category: "Travel", tags: ["travel", "shorts"], audioTrack: "Alpine drone — Elias Wander", createdAt: ago(3, 1) },
    { userId: u.ariavale.id, channelId: c["@ariavale"].id, kind: "short", title: "Chorus I wrote at 2am hits different", description: "From a voice note to this. #songwriting #music", videoUrl: `${G}/ForBiggerMeltdowns.mp4`, thumbnailUrl: IMG.t8, durationSec: 44, views: 4_150_000, likesCount: 203_000, category: "Music", tags: ["music", "shorts"], audioTrack: "Midnight Static (demo) — Aria Vale", createdAt: ago(0, 8) },
    { userId: u.ivychen.id, channelId: c["@ivychen"].id, kind: "short", title: "Why do bubbles always pop on a curve?", description: "Plateau borders did this to you. #science #shorts", videoUrl: `${G}/ForBiggerBlazes.mp4`, thumbnailUrl: IMG.t1, durationSec: 58, views: 1_120_000, likesCount: 64_000, category: "Education", tags: ["science", "shorts"], audioTrack: "Original audio — Ivy Chen", createdAt: ago(2, 11) },
    // Reels
    { userId: u["maya.cucina"].id, channelId: c["@mayacucina"].id, kind: "reel", title: "5 restaurant tricks they don't want you to know", description: "Rest, salt, acid, heat and mise en place. #chefsecrets #food", videoUrl: `${G}/ForBiggerFun.mp4`, thumbnailUrl: IMG.cf1, durationSec: 62, views: 5_600_000, likesCount: 268_000, category: "Cooking", tags: ["food", "reels", "chef"], audioTrack: "Trending: Sunny Kitchen — Latin House Duo", createdAt: ago(1, 6) },
    { userId: u.lenatoren.id, channelId: c["@lenatoren"].id, kind: "reel", title: "The golden hour recipe (3 settings only)", description: "f/1.8, 1/500, ISO 100. Go shoot. #photography #goldenhour", videoUrl: `${G}/ForBiggerJoyrides.mp4`, thumbnailUrl: IMG.tr6, durationSec: 55, views: 1_890_000, likesCount: 92_400, category: "Education", tags: ["photography", "reels"], audioTrack: "Golden Hour — Sunflower Fields", createdAt: ago(4, 2) },
    { userId: u.pixelprakash.id, channelId: c["@pixelprakash"].id, kind: "reel", title: "This boss fight emotionally broke me", description: "347 attempts. No hit needed. #gaming #bossfight", videoUrl: `${G}/ForBiggerEscapes.mp4`, thumbnailUrl: IMG.f5, durationSec: 49, views: 2_340_000, likesCount: 118_000, category: "Gaming", tags: ["gaming", "reels"], audioTrack: "Boss Theme Remix — ChipTuneLab", createdAt: ago(2, 7) },
    { userId: u.novabytes.id, channelId: c["@novabytes"].id, kind: "reel", title: "The $12 accessory I use every single day", description: "It replaced four things on my desk. #tech #desksetup", videoUrl: `${G}/ForBiggerBlazes.mp4`, thumbnailUrl: IMG.t2, durationSec: 36, views: 980_000, likesCount: 45_200, category: "Technology", tags: ["tech", "reels"], audioTrack: "Original audio — Nova Bytes", createdAt: ago(5, 1) },
    { userId: u.jadekimfit.id, channelId: c["@jadekimfit"].id, kind: "reel", title: "A 200g protein day of eating", description: "High volume, low cost, zero sad desk salads. #fitness #mealprep", videoUrl: `${G}/ForBiggerMeltdowns.mp4`, thumbnailUrl: IMG.f4, durationSec: 74, views: 3_870_000, likesCount: 176_000, category: "Fitness", tags: ["fitness", "reels", "mealprep"], audioTrack: "Yummy Beats — Kitchen Groove", createdAt: ago(0, 15) },
    { userId: u.marcoruizauto.id, channelId: c["@marcoruizauto"].id, kind: "reel", title: "This EV error code just cost $2,000", description: "Always pre-scan used EVs before you buy. Always. #ev #cars", videoUrl: `${G}/SubaruOutbackOnStreetAndDirt.mp4`, thumbnailUrl: IMG.tr4, durationSec: 58, views: 640_000, likesCount: 28_700, category: "Automotive", tags: ["ev", "reels"], audioTrack: "Original audio — Marco Ruiz", createdAt: ago(6, 3) },
  ]).returning();
  const v = insertedVideos;
  const vLong1 = v[0], vAria = v[7], vElias = v[2], vMaya = v[3];

  console.log("→ Creating posts…");
  const insertedPosts = await db.insert(posts).values([
    { userId: u.eliaswanders.id, caption: "Day 4, Seceda. Woke at 4:40am in a freezing hut and it was worth every shivering minute. Full vlog drops Sunday.\n\n#dolomites #hiking #seceda", mediaUrls: [IMG.tr5, IMG.tr2, IMG.tr3], kind: "carousel", location: "Seceda, Dolomites", tags: ["dolomites", "hiking"], likesCount: 24_800, commentsCount: 0, createdAt: ago(1, 3) },
    { userId: u["maya.cucina"].id, caption: "Sunday prep for the week: 60 dumplings, one faultless broth, zero leftovers by Friday. The pleat tutorial is pinned to my profile.\n\n#mealprep #dumplings", mediaUrls: [IMG.cf2], kind: "photo", location: "Mexico City", tags: ["mealprep", "dumplings"], likesCount: 18_200, createdAt: ago(2, 8) },
    { userId: u.lenatoren.id, caption: "Behind the lens: directing the golden hour session. One frame, four takes, zero Photoshop.\n\n#behindthescenes #photography", mediaUrls: [IMG.t7], kind: "photo", location: "Barcelona", tags: ["photography"], likesCount: 9_840, createdAt: ago(3, 5) },
    { userId: u.novabytes.id, caption: "New mic on the desk. Rode it against the studio chain for the full video — spoiler, it's complicated. Link in bio.\n\n#audio #podcasting", mediaUrls: [IMG.t4, IMG.t1], kind: "carousel", location: "Austin, TX", tags: ["audio"], likesCount: 6_420, createdAt: ago(1, 12) },
    { userId: u.jadekimfit.id, caption: "Night sessions hit different. 10pm crew, no mirrors, all work. Talk to me about splits below.\n\n#trainingrecap #gym", mediaUrls: [IMG.f5, IMG.f1], kind: "carousel", location: "Los Angeles", tags: ["gym"], likesCount: 21_300, createdAt: ago(0, 20) },
    { userId: u.alexrivera.id, caption: "Weekend reset in the Rockies. Shot this on the X100V with the Classic Negative recipe straight out of camera.\n\n#rockies #streetphotography", mediaUrls: [IMG.tr1, IMG.tr7, IMG.tr8], kind: "carousel", location: "Colorado, USA", tags: ["rockies"], likesCount: 1_842, createdAt: ago(2, 14) },
    { userId: u.ariavale.id, caption: "Studio diary: \"Midnight Static\" is officially mixed. Thank you for 2 years of patience on this record.\n\n#midnightstatic #newmusic", mediaUrls: [IMG.t8, IMG.t1], kind: "carousel", location: "Nashville, TN", tags: ["newmusic"], likesCount: 33_600, createdAt: ago(0, 6) },
    { userId: u.marcoruizauto.id, caption: "Found this 2019 EV at auction with 31k miles. Full diagnostic breakdown in Sunday's video.\n\n#ev #usedcars", mediaUrls: [IMG.tr4], kind: "photo", location: "Monterrey", tags: ["ev"], likesCount: 3_210, createdAt: ago(4, 9) },
  ]).returning();
  const p = insertedPosts;

  console.log("→ Social graph…");
  const demo = u.alexrivera;
  await db.insert(follows).values([
    { followerId: demo.id, followingId: u.novabytes.id },
    { followerId: demo.id, followingId: u["maya.cucina"].id },
    { followerId: demo.id, followingId: u.eliaswanders.id },
    { followerId: demo.id, followingId: u.jadekimfit.id },
    { followerId: demo.id, followingId: u.ariavale.id },
    { followerId: u.novabytes.id, followingId: demo.id },
    { followerId: u["maya.cucina"].id, followingId: u.ariavale.id },
    { followerId: u.eliaswanders.id, followingId: u.lenatoren.id },
    { followerId: u.jadekimfit.id, followingId: u.novabytes.id },
    { followerId: u.samokafor.id, followingId: demo.id },
  ]);
  await db.insert(subscriptions).values([
    { subscriberId: demo.id, channelId: c["@novabytes"].id },
    { subscriberId: demo.id, channelId: c["@mayacucina"].id },
    { subscriberId: demo.id, channelId: c["@eliaswanders"].id },
    { subscriberId: demo.id, channelId: c["@ariavale"].id },
    { subscriberId: u.ariavale.id, channelId: c["@novabytes"].id },
    { subscriberId: u.jadekimfit.id, channelId: c["@alexrivastava"].id },
    { subscriberId: u.pixelprakash.id, channelId: c["@alexrivastava"].id },
  ]);

  console.log("→ Comments, likes, saves…");
  const insertedComments = await db.insert(comments).values([
    { userId: u.ariavale.id, videoId: vLong1.id, content: "That cable routing at 9:32 is witchcraft. Instant subscribe.", likesCount: 214, createdAt: ago(1, 20) },
    { userId: u.jadekimfit.id, videoId: vLong1.id, content: "The acoustic panels make more difference than any mic you could buy. Great call.", likesCount: 96, createdAt: ago(1, 7) },
    { userId: u.pixelprakash.id, videoId: vLong1.id, content: "Budget breakdown timestamp alone deserves a like.", likesCount: 41, createdAt: ago(0, 22) },
    { userId: demo.id, videoId: vLong1.id, content: "Rebuilt mine last winter after this exact video. The mat is not optional.", likesCount: 18, createdAt: ago(0, 9) },
    { userId: u.novabytes.id, videoId: vElias.id, content: "Day 3 at Seceda made the whole trip. Beautiful edit.", likesCount: 88, createdAt: ago(4, 12) },
    { userId: u.lenatoren.id, videoId: vElias.id, content: "The light in that ridge line shot… unreal.", likesCount: 52, createdAt: ago(4, 3) },
    { userId: demo.id, videoId: vAria.id, content: "That 2am chorus is stuck in my head. Pre-saving midnight static NOW.", likesCount: 134, createdAt: ago(5, 16) },
    { userId: u.samokafor.id, videoId: vAria.id, content: "The live take at 18 minutes sent chills.", likesCount: 61, createdAt: ago(5, 2) },
    { userId: u.ariavale.id, videoId: vMaya.id, content: "Made the pan sauce for salmon last night — restaurant quality is not an exaggeration.", likesCount: 173, createdAt: ago(3, 14) },
    { userId: demo.id, postId: p[0].id, content: "Absolutely unreal. Saving this for my Italy trip.", likesCount: 27, createdAt: ago(1, 2) },
    { userId: u.marcoruizauto.id, postId: p[1].id, content: "The broth recipe when?", likesCount: 12, createdAt: ago(2, 4) },
    { userId: demo.id, postId: p[6].id, content: "Two years of patience and it SHOWS. So proud.", likesCount: 45, createdAt: ago(0, 3) },
  ]).returning();
  await db.update(videos).set({ commentsCount: 4 }).where(sql`id = ${vLong1.id}`);
  await db.update(videos).set({ commentsCount: 1 }).where(sql`id = ${vAria.id}`);
  await db.update(posts).set({ commentsCount: 1 }).where(sql`id = ${p[0].id}`);
  await db.update(posts).set({ commentsCount: 1 }).where(sql`id = ${p[6].id}`);
  await db.insert(likes).values([
    { userId: demo.id, targetType: "video", targetId: vLong1.id },
    { userId: demo.id, targetType: "video", targetId: vAria.id },
    { userId: demo.id, targetType: "post", targetId: p[0].id },
    { userId: demo.id, targetType: "comment", targetId: insertedComments[0].id },
  ]);
  await db.insert(saves).values([
    { userId: demo.id, targetType: "video", targetId: vElias.id },
    { userId: demo.id, targetType: "video", targetId: vMaya.id },
    { userId: demo.id, targetType: "post", targetId: p[0].id },
  ]);

  console.log("→ Library: playlists & history…");
  const [watchLater, tripPrep] = await db.insert(playlists).values([
    { userId: demo.id, title: "Watch Later", description: "Your queue across devices.", isPrivate: true },
    { userId: demo.id, title: "Dolomites Trip Research", description: "Everything for the September trek." },
  ]).returning();
  await db.insert(playlistItems).values([
    { playlistId: watchLater.id, videoId: vLong1.id, position: 0 },
    { playlistId: watchLater.id, videoId: vMaya.id, position: 1 },
    { playlistId: tripPrep.id, videoId: vElias.id, position: 0 },
    { playlistId: watchLater.id, videoId: vAria.id, position: 2 },
  ]);
  await db.insert(watchHistory).values([
    { userId: demo.id, videoId: vLong1.id, progressSec: 742, watchedAt: ago(0, 3) },
    { userId: demo.id, videoId: vElias.id, progressSec: 1467, watchedAt: ago(1, 6) },
    { userId: demo.id, videoId: vAria.id, progressSec: 320, watchedAt: ago(2, 1) },
  ]);

  console.log("→ Stories…");
  const insertedStories = await db.insert(stories).values([
    { userId: u.novabytes.id, mediaUrl: IMG.t6, mediaType: "image", caption: "New desk build goes up tomorrow 8pm ET", createdAt: ago(0, 5), expiresAt: future(19) },
    { userId: u["maya.cucina"].id, mediaUrl: IMG.cf3, mediaType: "image", caption: "Pan sauce masterclass tomorrow — bring questions", createdAt: ago(0, 3), expiresAt: future(21) },
    { userId: u.eliaswanders.id, mediaUrl: IMG.tr2, mediaType: "image", caption: "Sunrise ridge. Day 4 of 8.", createdAt: ago(0, 8), expiresAt: future(16) },
    { userId: u.jadekimfit.id, mediaUrl: IMG.f1, mediaType: "image", caption: "New program drops Friday 🔥", createdAt: ago(0, 2), expiresAt: future(22) },
    { userId: u.ariavale.id, mediaUrl: IMG.t8, mediaType: "image", caption: "Midnight Static listening party Saturday", createdAt: ago(0, 10), expiresAt: future(14) },
    { userId: u.lenatoren.id, mediaUrl: IMG.tr6, mediaType: "image", caption: "Golden hour window today: 6:42–7:15pm", createdAt: ago(0, 1), expiresAt: future(23) },
  ]).returning();
  await db.insert(storyViews).values([
    { storyId: insertedStories[0].id, viewerId: demo.id },
  ]);
  await db.insert(storyHighlights).values([
    { userId: u.eliaswanders.id, title: "Dolomites", coverUrl: IMG.tr5 },
    { userId: u.eliaswanders.id, title: "Patagonia", coverUrl: IMG.tr4 },
    { userId: u.lenatoren.id, title: "Golden Hour", coverUrl: IMG.tr6 },
    { userId: u["maya.cucina"].id, title: "Grandma's Kitchen", coverUrl: IMG.cf1 },
  ]);

  console.log("→ Conversations & messages…");
  const [dmNova, group] = await db.insert(conversations).values([
    { type: "direct" },
    { type: "group", name: "Creator Lounge" },
  ]).returning();
  await db.insert(conversationMembers).values([
    { conversationId: dmNova.id, userId: demo.id, lastReadAt: ago(0, 2) },
    { conversationId: dmNova.id, userId: u.novabytes.id, lastReadAt: ago(0, 1) },
    { conversationId: group.id, userId: demo.id, lastReadAt: ago(0, 6) },
    { conversationId: group.id, userId: u.novabytes.id, lastReadAt: ago(0, 5) },
    { conversationId: group.id, userId: u["maya.cucina"].id, lastReadAt: ago(0, 4) },
    { conversationId: group.id, userId: u.eliaswanders.id, lastReadAt: ago(0, 7) },
  ]);
  await db.insert(messages).values([
    { conversationId: dmNova.id, senderId: u.novabytes.id, content: "Hey! Saw your Rockies shots — brutal light, great instincts.", createdAt: ago(0, 4) },
    { conversationId: dmNova.id, senderId: demo.id, content: "Thanks man! That Classic Negative recipe carries everything.", createdAt: ago(0, 3, ) },
    { conversationId: dmNova.id, senderId: u.novabytes.id, content: "Want to collab on the desk tour episode? You've got the camera chops.", createdAt: ago(0, 2) },
    { conversationId: group.id, senderId: u["maya.cucina"].id, content: "Cooking a 3-course dinner on stream this weekend, who's in?", createdAt: ago(0, 9) },
    { conversationId: group.id, senderId: u.eliaswanders.id, content: "In. But only if Alex brings the camera.", createdAt: ago(0, 8) },
    { conversationId: group.id, senderId: u.novabytes.id, content: "Always with the plug. See you both at 7.", createdAt: ago(0, 7) },
    { conversationId: group.id, senderId: demo.id, content: "I'll be there with the X100V. Someone handle audio.", createdAt: ago(0, 6) },
  ]);

  console.log("→ Notifications…");
  await db.insert(notifications).values([
    { userId: demo.id, actorId: u.novabytes.id, type: "subscribe", content: "Nova Bytes is streaming now: “Building the 2026 Battlestation — Live”", link: "/live", read: false, createdAt: ago(0, 1) },
    { userId: demo.id, actorId: u.ariavale.id, type: "mention", content: "Aria Vale mentioned you in a comment: “Alex you have to hear this mix”", link: `/watch/${vAria.id}`, read: false, createdAt: ago(0, 4) },
    { userId: demo.id, actorId: u["maya.cucina"].id, type: "like", content: "Maya Calderón liked your comment on “The Perfect Pan Sauce”", link: `/watch/${vMaya.id}`, read: false, createdAt: ago(0, 6) },
    { userId: demo.id, actorId: u.novabytes.id, type: "comment", content: "Nova Bytes replied: “Rebuilt mine last winter after this exact video…”", link: `/watch/${vLong1.id}`, read: false, createdAt: ago(0, 9) },
    { userId: demo.id, actorId: u.eliaswanders.id, type: "follow", content: "Elias Wander started following you", link: "/profile/eliaswanders", read: true, createdAt: ago(1, 3) },
    { userId: demo.id, type: "payout", content: "Your payout of $486.20 was sent to •••• 4417", link: "/studio", read: true, createdAt: ago(2, 0) },
    { userId: demo.id, actorId: u.jadekimfit.id, type: "subscribe", content: "Jade Kim subscribed to your channel", link: "/profile/jadekimfit", read: true, createdAt: ago(3, 5) },
    { userId: demo.id, type: "system", content: "Welcome to SocialVerse! Complete your creator profile to unlock monetization.", link: "/settings", read: true, createdAt: ago(6, 0) },
  ]);

  console.log("→ Live streams…");
  const insertedLive = await db.insert(liveStreams).values([
    { userId: u.novabytes.id, title: "Building the 2026 Battlestation — Live", category: "Technology", thumbnailUrl: IMG.t1, status: "live", viewerCount: 1847, videoUrl: `${G}/ForBiggerFun.mp4`, startedAt: ago(0, 2) },
    { userId: u.ariavale.id, title: "Studio session: final mix of Midnight Static", category: "Music", thumbnailUrl: IMG.t8, status: "live", viewerCount: 942, videoUrl: `${G}/ForBiggerJoyrides.mp4`, startedAt: ago(0, 1) },
    { userId: u["maya.cucina"].id, title: "Sunday pasta — subscriber cook-along", category: "Cooking", thumbnailUrl: IMG.cf4, status: "scheduled", viewerCount: 0, startedAt: future(30) },
  ]).returning();
  await db.insert(liveMessages).values([
    { streamId: insertedLive[0].id, userId: u.jadekimfit.id, content: "That GPU mount is CLEAN", createdAt: ago(0, 1) },
    { streamId: insertedLive[0].id, userId: u.pixelprakash.id, content: "cable comb supremacy", createdAt: ago(0, 0, ) },
    { streamId: insertedLive[0].id, userId: demo.id, content: "subscribed and everything", createdAt: ago(0, 0) },
    { streamId: insertedLive[1].id, userId: u.samokafor.id, content: "THIS MIX. 😭", createdAt: ago(0, 0) },
    { streamId: insertedLive[1].id, userId: u["maya.cucina"].id, content: "audio is crispy tonight", createdAt: ago(0, 0) },
  ]);

  console.log("→ Monetization…");
  await db.insert(monetizationAccounts).values([
    { userId: demo.id, eligible: true, tier: "partner", payoutMethod: "Bank •••• 4417", taxFormOnFile: true, lifetimeEarned: "2841.37" },
    { userId: u.novabytes.id, eligible: true, tier: "premium", payoutMethod: "Wire •••• 7781", taxFormOnFile: true, lifetimeEarned: "48200.10" },
    { userId: u.ariavale.id, eligible: true, tier: "premium", payoutMethod: "Wire •••• 9021", taxFormOnFile: true, lifetimeEarned: "96400.00" },
  ]);
  await db.insert(transactions).values([
    { userId: demo.id, amount: "342.18", type: "ad_revenue", description: "Ad revenue — May 2026 (10,240 hours watched)", status: "completed", createdAt: ago(40, 0) },
    { userId: demo.id, amount: "128.50", type: "membership", description: "Creator memberships — May 2026 (37 members)", status: "completed", createdAt: ago(40, 1) },
    { userId: demo.id, amount: "96.00", type: "tip", description: "Tip from @lenatoren — “For the Italy edit fund”", status: "completed", createdAt: ago(21, 3) },
    { userId: demo.id, amount: "18.20", type: "bonus", description: "SocialVerse Shorts bonus pool — April 2026", status: "completed", createdAt: ago(34, 2) },
    { userId: demo.id, amount: "486.20", type: "payout", description: "Payout to Bank •••• 4417", status: "completed", createdAt: ago(9, 2) },
    { userId: demo.id, amount: "214.61", type: "ad_revenue", description: "Ad revenue — June 2026 (month to date)", status: "pending", createdAt: ago(0, 12) },
    { userId: u.alexrivera.id, amount: "714.00", type: "sponsorship", description: "Sponsorship — Peak Gear (Rockies series)", status: "completed", createdAt: ago(15, 4) },
  ]);

  console.log("→ Reports…");
  await db.insert(reports).values([
    { reporterId: demo.id, targetType: "video", targetId: v[9].id, reason: "Copyright / reused content", details: "Clip appears to reuse another channel's footage without credit.", status: "open", createdAt: ago(1, 8) },
    { reporterId: u.novabytes.id, targetType: "comment", targetId: insertedComments[5].id, reason: "Harassment", details: "Repeated hostile replies across my uploads.", status: "open", createdAt: ago(0, 14) },
    { reporterId: u.ariavale.id, targetType: "post", targetId: p[4].id, reason: "Misleading caption", details: "Resolving as creator-contact instead of removal.", status: "resolved", createdAt: ago(5, 2) },
  ]);

  console.log("✅ Seed complete: 12 users, 12 channels, 22 videos, 8 posts, stories, DMs, live streams, transactions.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
