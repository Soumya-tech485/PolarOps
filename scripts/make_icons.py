import struct
import zlib
import math

def write_png(filename: str, width: int, height: int, rgba_pixels: bytearray):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)
        row_start = y * width * 4
        raw_data.extend(rgba_pixels[row_start : row_start + width * 4])

    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    png = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">II", width, height) + bytes([8, 6, 0, 0, 0])
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw_data), level=9))
    png += chunk(b"IEND", b"")

    with open(filename, "wb") as f:
        f.write(png)

def generate_polar_icon(size: int, filename: str):
    pixels = bytearray(size * size * 4)
    cx, cy = size / 2.0, size / 2.0
    r_corner = size * 0.18
    w, h = float(size), float(size)

    # Colors
    bg_r, bg_g, bg_b = 31, 111, 176 # #1f6fb0
    white_r, white_g, white_b = 255, 255, 255
    ice_r, ice_g, ice_b = 244, 249, 253 # #f4f9fd

    def in_rounded_rect(x, y):
        # check distance to nearest corner if outside inner rect
        clamped_x = max(r_corner, min(w - r_corner, x))
        clamped_y = max(r_corner, min(h - r_corner, y))
        dx = x - clamped_x
        dy = y - clamped_y
        return (dx * dx + dy * dy) <= (r_corner * r_corner)

    def dist_to_segment(px, py, x1, y1, x2, y2):
        dx, dy = x2 - x1, y2 - y1
        length_sq = dx * dx + dy * dy
        if length_sq == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / length_sq))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    # Polar icon geometry (hexagon + compass cross + center circle)
    # Hexagon vertices scaled to size
    scale = size / 512.0
    hex_pts = [
        (256 * scale, 96 * scale),
        (392 * scale, 176 * scale),
        (392 * scale, 336 * scale),
        (256 * scale, 416 * scale),
        (120 * scale, 336 * scale),
        (120 * scale, 176 * scale),
    ]

    segments = []
    # Outer hexagon
    for i in range(6):
        segments.append((hex_pts[i], hex_pts[(i + 1) % 6], 14.0 * scale))
    # Internal lattice lines
    segments.append((hex_pts[0], hex_pts[3], 8.0 * scale))
    segments.append((hex_pts[5], hex_pts[2], 8.0 * scale))
    segments.append((hex_pts[1], hex_pts[4], 8.0 * scale))

    circle_r = 34.0 * scale

    for y in range(size):
        fy = y + 0.5
        for x in range(size):
            fx = x + 0.5
            idx = (y * size + x) * 4

            if not in_rounded_rect(fx, fy):
                pixels[idx:idx+4] = bytes([0, 0, 0, 0])
                continue

            # Start with background
            col_r, col_g, col_b, col_a = bg_r, bg_g, bg_b, 255

            # Check lines
            for (x1, y1), (x2, y2), thick in segments:
                d = dist_to_segment(fx, fy, x1, y1, x2, y2)
                if d <= thick:
                    col_r, col_g, col_b = white_r, white_g, white_b

            # Center circle
            cd = math.hypot(fx - cx, fy - cy)
            if cd <= circle_r:
                col_r, col_g, col_b = ice_r, ice_g, ice_b

            pixels[idx] = col_r
            pixels[idx+1] = col_g
            pixels[idx+2] = col_b
            pixels[idx+3] = col_a

    write_png(filename, size, size, pixels)

generate_polar_icon(192, "frontend/public/icons/icon-192.png")
generate_polar_icon(512, "frontend/public/icons/icon-512.png")
print("Icons generated successfully!")
