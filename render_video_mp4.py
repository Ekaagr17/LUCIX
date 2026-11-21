# Render Forensic Briefing Video as MP4 (3 Minutes, 5400 frames)
# Narrated exclusively by LUCA (Forensic Intelligence Engine)

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def render_mp4():
    output_path = "d:/randoms/lucix/LUCIX_Forensic_Briefing_3Min.mp4"
    width, height = 1280, 720
    fps = 30
    total_duration_sec = 180  # 3 minutes
    total_frames = total_duration_sec * fps

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    print(f"Generating Forensic Briefing MP4 ({total_frames} frames) at {width}x{height}...")

    try:
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_body = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 13)
        font_huge = ImageFont.truetype("arial.ttf", 52)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_body = font_title
        font_small = font_title
        font_huge = font_title

    scenes = [
        (0, 25, "ACT 1: THE GEOLOCATION ILLUSION", (244, 63, 94)),
        (25, 55, "ACT 2: 5-LAYER FORENSIC PIPELINE", (56, 189, 248)),
        (55, 90, "ACT 3: GEOINT & 9,360 KM TOR JUMP", (234, 179, 8)),
        (90, 125, "ACT 4: ATTACK SIMULATION STUDIO", (239, 68, 68)),
        (125, 155, "ACT 5: DIRECTED ATTACK GRAPH & CUSTODY", (34, 197, 94)),
        (155, 180, "ACT 6: AUTONOMOUS FORENSIC INTELLIGENCE", (167, 139, 250))
    ]

    subtitles = [
        (0, 12, "Every day in SOCs worldwide, analysts make a fatal mistake: treating an IP address as an attacker's physical home."),
        (12, 25, "They are looking at a decoy. Between cloud servers, VPNs, and Tor exit relays, GeoIP is an illusion. Welcome to LUCIX."),
        (25, 40, "I am LUCA. Our system deploys a 5-layer pipeline: mathematical SHA-256 hash chaining locks telemetry into an immutable audit trail."),
        (40, 55, "Our classifier inspects ASNs and rDNS, while consensus engine correlates 3 GeoIP vendors. Law: Infrastructure != Physical Location."),
        (55, 72, "At 09:12 UTC, Tor exit 185.220.101.34 hit our perimeter. 3 vendors agree on Frankfurt, but confidence is capped at LOW."),
        (72, 90, "52 mins later, this IP jumped 9,360 km to Singapore. A naive system cries spoofing. LUCIX diagnoses Tor circuit rotation."),
        (90, 108, "Static logs are dead. Our Simulation Studio reconstructs the breach in real-time across Recon, Initial Access, and Execution."),
        (108, 125, "As the threat gauge surges to critical, floating glassmorphic alerts trigger with tactical radar pings across all views."),
        (125, 140, "In the Attack Graph, directed vectors illuminate lateral pivoting across SMB port 445 directly into Server-02."),
        (140, 155, "Every event is chained with SHA-256. If an adversary modifies a single log byte, the cryptographic chain instantly breaks."),
        (155, 167, "I operate 100% offline. No external APIs, zero latency. Interrogate me via voice or text for instant mathematical attribution."),
        (167, 180, "LUCIX bridges cryptographic truth, spatial consensus, and simulation. The era of guesswork in cyber forensics is over.")
    ]

    step = 5
    rendered_frames = 0

    for frame_idx in range(0, total_frames, step):
        t_sec = frame_idx / fps

        curr_scene = scenes[-1]
        for s in scenes:
            if s[0] <= t_sec < s[1]:
                curr_scene = s
                break

        curr_sub = subtitles[-1]
        for sb in subtitles:
            if sb[0] <= t_sec < sb[1]:
                curr_sub = sb
                break

        img = Image.new('RGB', (width, height), color=(6, 6, 20))
        draw = ImageDraw.Draw(img)

        # Ambient Glow
        draw.ellipse([width//2 - 400, -100, width//2 + 400, 500], fill=(18, 14, 45))

        # HUD Top
        draw.rectangle([0, 0, width, 55], fill=(12, 12, 30))
        draw.line([0, 55, width, 55], fill=(45, 45, 75), width=1)
        draw.text((30, 18), "⬡ LUCIX AUTONOMOUS INTELLIGENCE SHOWCASE", fill=(167, 139, 250), font=font_body)
        draw.text((width//2 - 140, 18), curr_scene[2], fill=curr_scene[3], font=font_body)

        mins = int(t_sec // 60)
        secs = int(t_sec % 60)
        draw.text((width - 160, 18), f"{mins:02d}:{secs:02d} / 03:00", fill=(56, 189, 248), font=font_body)

        progress_w = int((t_sec / total_duration_sec) * width)
        draw.rectangle([0, 55, progress_w, 58], fill=(124, 58, 237))

        scene_id = scenes.index(curr_scene) + 1

        if scene_id == 1:
            draw.text((width//2, 125), "The Geolocation Illusion in Cyber Forensics", fill=(255, 255, 255), font=font_title, anchor="mm")
            draw.text((width//2, 170), "Why Standard GeoIP Fails During Advanced Persistent Threats", fill=(148, 163, 184), font=font_sub, anchor="mm")

            draw.rounded_rectangle([200, 240, 480, 340], radius=10, fill=(15, 23, 42), outline=(56, 189, 248))
            draw.text((340, 270), "Observed Telemetry", fill=(148, 163, 184), font=font_small, anchor="mm")
            draw.text((340, 305), "185.220.101.34", fill=(56, 189, 248), font=font_body, anchor="mm")

            draw.text((width//2, 290), "ROUTED VIA DECOY", fill=(167, 139, 250), font=font_body, anchor="mm")

            draw.rounded_rectangle([800, 240, 1080, 340], radius=10, fill=(15, 23, 42), outline=(239, 68, 68))
            draw.text((940, 270), "Attacker Physical Origin", fill=(148, 163, 184), font=font_small, anchor="mm")
            draw.text((940, 305), "UNKNOWN (Tor Relay)", fill=(239, 68, 68), font=font_body, anchor="mm")

            draw.rounded_rectangle([width//2 - 360, 410, width//2 + 360, 480], radius=10, fill=(35, 15, 25), outline=(239, 68, 68))
            draw.text((width//2, 445), "FORENSIC LAW: Infrastructure Location is Never Human Location", fill=(248, 113, 113), font=font_body, anchor="mm")

        elif scene_id == 2:
            draw.text((width//2, 105), "The 5-Layer Autonomous Verification Pipeline", fill=(255, 255, 255), font=font_title, anchor="mm")
            p_stages = [
                ("1. Ingestion", "Raw Telemetry", (56, 189, 248)),
                ("2. Cryptography", "SHA-256 Chain", (34, 197, 94)),
                ("3. Classifier", "ASN / rDNS Heuristics", (167, 139, 250)),
                ("4. Consensus", "3-Vendor Spatial Score", (234, 179, 8)),
                ("5. Anti-Spoof", "Velocity Jump", (239, 68, 68))
            ]
            for i, st in enumerate(p_stages):
                bx = 80 + i * 230
                draw.rounded_rectangle([bx, 170, bx + 190, 300], radius=10, fill=(18, 20, 45), outline=st[2], width=2)
                draw.text((bx + 95, 205), st[0], fill=st[2], font=font_body, anchor="mm")
                draw.text((bx + 95, 245), st[1], fill=(148, 163, 184), font=font_small, anchor="mm")
                draw.text((bx + 95, 275), "● VERIFYING", fill=st[2], font=font_small, anchor="mm")

            draw.rounded_rectangle([160, 360, width - 160, 500], radius=12, fill=(15, 12, 38), outline=(124, 58, 237))
            draw.text((width//2, 400), "Web Crypto API Sequential Chaining", fill=(255, 255, 255), font=font_sub, anchor="mm")
            draw.text((width//2, 440), "event_hash = SHA256( previous_event_hash + raw_payload )", fill=(56, 189, 248), font=font_body, anchor="mm")
            draw.text((width//2, 475), "✓ Immutable Audit Trail  •  ✓ Zero External Dependencies", fill=(34, 197, 94), font=font_body, anchor="mm")

        elif scene_id == 3:
            draw.text((width//2, 100), "GEOINT Consensus & 9,360 km Tor Circuit Rotation", fill=(255, 255, 255), font=font_title, anchor="mm")
            draw.rounded_rectangle([80, 150, 680, 500], radius=12, fill=(10, 15, 28), outline=(56, 189, 248))
            draw.text((380, 180), "Spatial Anomaly Tracking", fill=(56, 189, 248), font=font_body, anchor="mm")
            draw.ellipse([260, 240, 280, 260], fill=(167, 139, 250))
            draw.text((270, 225), "Frankfurt (09:12 UTC)", fill=(255, 255, 255), font=font_small, anchor="mm")
            draw.ellipse([540, 380, 560, 400], fill=(234, 179, 8))
            draw.text((550, 415), "Singapore (10:04 UTC)", fill=(255, 255, 255), font=font_small, anchor="mm")
            draw.line([270, 250, 550, 390], fill=(239, 68, 68), width=3)
            draw.text((410, 305), "⚠ 9,360 km in 52 mins (Tor Rotation)", fill=(248, 113, 113), font=font_body, anchor="mm")

            draw.rounded_rectangle([720, 150, 1200, 500], radius=12, fill=(18, 18, 42), outline=(100, 100, 160))
            draw.text((960, 185), "3-VENDOR GEOMETRIC CONSENSUS", fill=(167, 139, 250), font=font_body, anchor="mm")
            draw.text((750, 235), "• MaxMind: Frankfurt, Germany (AGREES)", fill=(255, 255, 255), font=font_body)
            draw.text((750, 275), "• IPinfo: Frankfurt, Germany (AGREES)", fill=(255, 255, 255), font=font_body)
            draw.text((750, 315), "• ip-api: Frankfurt, Germany (AGREES)", fill=(255, 255, 255), font=font_body)
            draw.rounded_rectangle([740, 370, 1180, 460], radius=8, fill=(35, 15, 25), outline=(239, 68, 68))
            draw.text((960, 400), "CONFIDENCE: LOW (Tor Hard-Cap Enforced)", fill=(239, 68, 68), font=font_body, anchor="mm")
            draw.text((960, 430), "Tor Relay Identified. Physical Location = UNKNOWN", fill=(203, 213, 225), font=font_small, anchor="mm")

        elif scene_id == 4:
            draw.text((width//2, 100), "Real-Time Attack Simulation Studio", fill=(255, 255, 255), font=font_title, anchor="mm")
            draw.rounded_rectangle([80, 145, width - 80, 205], radius=8, fill=(15, 20, 40), outline=(244, 63, 94))
            draw.text((120, 175), "🔴 SIMULATION ACTIVE (60x Speed)", fill=(244, 63, 94), font=font_body)
            draw.text((width - 140, 175), "09:38:00 UTC", fill=(56, 189, 248), font=font_body, anchor="mm")

            draw.rounded_rectangle([80, 230, 420, 500], radius=10, fill=(18, 18, 42), outline=(239, 68, 68))
            draw.text((250, 265), "THREAT LEVEL GAUGE", fill=(148, 163, 184), font=font_small, anchor="mm")
            draw.text((250, 330), "84%", fill=(239, 68, 68), font=font_huge, anchor="mm")
            draw.text((250, 380), "CRITICAL BREACH ESCALATION", fill=(248, 113, 113), font=font_body, anchor="mm")

            draw.rounded_rectangle([450, 230, 830, 500], radius=10, fill=(18, 18, 42), outline=(56, 189, 248))
            draw.text((640, 265), "REAL-TIME TELEMETRY STREAM", fill=(148, 163, 184), font=font_small, anchor="mm")
            sim_evs = [
                "E001: Port Scan from Tor (09:12)",
                "E003: Inbound Connection :4444 (09:23)",
                "E004: PowerShell spawned under explorer (09:31)",
                "E007: SMB Pivot to SERVER-02 (09:52)",
                "E010: Exfiltration to 198.54.117.200 (10:22)"
            ]
            for idx, sev in enumerate(sim_evs):
                draw.text((475, 305 + idx * 36), f"● {sev}", fill=(226, 232, 240), font=font_small)

            draw.rounded_rectangle([860, 230, 1200, 500], radius=10, fill=(18, 18, 42), outline=(167, 139, 250))
            draw.text((1030, 265), "TACTICAL TOAST ALERTS", fill=(148, 163, 184), font=font_small, anchor="mm")
            draw.rounded_rectangle([885, 300, 1175, 420], radius=8, fill=(35, 15, 25), outline=(239, 68, 68))
            draw.text((910, 330), "🔴 CRITICAL ALERT: E010", fill=(239, 68, 68), font=font_body)
            draw.text((910, 360), "Bulk outbound data transfer", fill=(255, 255, 255), font=font_small)
            draw.text((910, 390), "Investigate Telemetry →", fill=(56, 189, 248), font=font_small)

        elif scene_id == 5:
            draw.text((width//2, 100), "Directed Kill Chain & SHA-256 Custody", fill=(255, 255, 255), font=font_title, anchor="mm")
            draw.rounded_rectangle([80, 150, 640, 500], radius=12, fill=(12, 14, 32), outline=(124, 58, 237))
            draw.text((360, 180), "Directed SVG Attack Graph Vectors", fill=(167, 139, 250), font=font_body, anchor="mm")
            draw.rounded_rectangle([110, 220, 240, 270], radius=6, fill=(30, 15, 25), outline=(239, 68, 68))
            draw.text((175, 245), "185.220.101.34", fill=(255, 255, 255), font=font_small, anchor="mm")
            draw.rounded_rectangle([300, 280, 450, 335], radius=6, fill=(15, 25, 45), outline=(56, 189, 248))
            draw.text((375, 307), "WORKSTATION-01", fill=(255, 255, 255), font=font_small, anchor="mm")
            draw.rounded_rectangle([500, 280, 620, 335], radius=6, fill=(25, 15, 40), outline=(167, 139, 250))
            draw.text((560, 307), "SERVER-02", fill=(255, 255, 255), font=font_small, anchor="mm")
            draw.line([240, 245, 300, 295], fill=(239, 68, 68), width=2)
            draw.line([450, 307, 500, 307], fill=(167, 139, 250), width=2)

            draw.rounded_rectangle([680, 150, 1200, 500], radius=12, fill=(12, 22, 25), outline=(34, 197, 94))
            draw.text((940, 185), "CRYPTOGRAPHIC CHAIN OF CUSTODY", fill=(34, 197, 94), font=font_body, anchor="mm")
            chain_demo = [
                ("E001 [Port Scan]", "Hash: e3b0c442... | Prev: 00000000..."),
                ("E002 [DNS Recon]", "Hash: 8f434346... | Prev: e3b0c442..."),
                ("E003 [Access 4444]", "Hash: 6b86b273... | Prev: 8f434346...")
            ]
            for idx, ch in enumerate(chain_demo):
                draw.rounded_rectangle([710, 220 + idx * 85, 1170, 285 + idx * 85], radius=6, fill=(16, 32, 28), outline=(34, 197, 94))
                draw.text((730, 245 + idx * 85), ch[0], fill=(255, 255, 255), font=font_body)
                draw.text((1150, 245 + idx * 85), "✓ SEALED", fill=(34, 197, 94), font=font_body, anchor="rm")
                draw.text((730, 268 + idx * 85), ch[1], fill=(148, 163, 184), font=font_small)

        else:
            draw.ellipse([width//2 - 40, 130, width//2 + 40, 210], fill=(124, 58, 237))
            draw.text((width//2, 170), "🧠", fill=(255, 255, 255), font=font_title, anchor="mm")

            draw.text((width//2, 240), "LUCA: Autonomous Forensic Intelligence Core", fill=(255, 255, 255), font=font_title, anchor="mm")
            draw.rounded_rectangle([width//2 - 380, 270, width//2 + 380, 360], radius=12, fill=(25, 20, 55), outline=(124, 58, 237))
            draw.text((width//2, 298), "FORENSIC BRIEFING (ZERO EXTERNAL APIS)", fill=(167, 139, 250), font=font_small, anchor="mm")
            draw.text((width//2, 330), "“Physical operator location is UNKNOWN. All source IPs are cloud/Tor.”", fill=(255, 255, 255), font=font_body, anchor="mm")

            draw.rounded_rectangle([width//2 - 400, 390, width//2 + 400, 520], radius=12, fill=(18, 20, 48), outline=(56, 189, 248))
            draw.text((width//2, 430), "LUCIX: The Future of Incident Attribution", fill=(56, 189, 248), font=font_sub, anchor="mm")
            draw.text((width//2, 468), "100% Client-Side Engine  •  Zero API Dependencies  •  Multi-Source GEOINT", fill=(148, 163, 184), font=font_small, anchor="mm")
            draw.text((width//2, 498), "Transforming Cyber Attribution from Speculation into Mathematical Certainty", fill=(34, 197, 94), font=font_body, anchor="mm")

        # Bottom Subtitle Banner
        draw.rounded_rectangle([width//2 - 480, height - 120, width//2 + 480, height - 35], radius=10, fill=(8, 8, 22), outline=(70, 70, 110))
        draw.text((width//2, height - 100), "SPEAKER: LUCA (FORENSIC INTELLIGENCE ENGINE)", fill=curr_scene[3], font=font_small, anchor="mm")
        draw.text((width//2, height - 65), curr_sub[2], fill=(255, 255, 255), font=font_body, anchor="mm")

        cv_frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

        for _ in range(step):
            out.write(cv_frame)
            rendered_frames += 1

    out.release()
    print(f"SUCCESS: Forensic Briefing video rendered at '{output_path}' ({rendered_frames} frames written).")

if __name__ == "__main__":
    render_mp4()
