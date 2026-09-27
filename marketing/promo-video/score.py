"""Original synthesized score for the Viva Voce AI film, timed to film.html."""
import numpy as np, wave

SR = 44100
DUR = 75.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
t_all = np.arange(N) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.full(n, s, dtype=float)
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False)
    dd = min(d, max(0, n - a)); e[a:a + dd] = np.linspace(1, s, dd, endpoint=False)
    if r > 0 and n > r:
        e[n - r:] *= np.linspace(1, 0, r)
    return e


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l
    R[i:i + len(sig)] += sig * gain * r


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for k in range(len(x)):
        acc = (1 - a) * x[k] + a * acc; y[k] = acc
    return y


def lp_fast(x, cutoff):
    # one-pole lowpass via FFT-domain approximation (fine for pads / noise beds)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X * H, len(x))


def pad(freqs, dur, attack=1.5, release=2.0, bright=1.0, detune=0.004):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ff = f * (1 + d)
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sin(2 * np.pi * ff * tt + ph)
            s += 0.35 * bright * np.sin(2 * np.pi * 2 * ff * tt + ph)
            s += 0.12 * bright * np.sin(2 * np.pi * 3 * ff * tt + ph)
    s /= (len(freqs) * 3)
    s *= 1 + 0.08 * np.sin(2 * np.pi * 0.23 * tt)
    return s * env_adsr(n, attack, 0.5, 0.9, release)


def bell(f, dur=4.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    partials = [(1, 1.0, 1.4), (2.0, 0.45, 2.2), (2.76, 0.22, 3.2), (4.07, 0.12, 4.5), (5.4, 0.06, 6)]
    s = sum(a * np.exp(-k * tt) * np.sin(2 * np.pi * f * m * tt) for m, a, k in partials)
    s *= np.minimum(1, tt / 0.004)
    return s


def pluck(f, dur=1.4, damp=0.996):
    n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p); buf = lp_fast(np.concatenate([buf] * 4), 5000)[:p]
    out = np.empty(n)
    for k in range(n):
        v = buf[k % p]; out[k] = v
        buf[k % p] = damp * 0.5 * (v + buf[(k + 1) % p])
    return out * np.exp(-np.arange(n) / SR * 1.6)


def click(dur=0.018, tone=3200, gain=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = rng.uniform(-1, 1, n) * np.exp(-tt * 380) + 0.5 * np.sin(2 * np.pi * tone * tt) * np.exp(-tt * 500)
    return np.diff(np.concatenate([[0], s])) * gain


def boom(dur=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = 38 + 60 * np.exp(-tt * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-tt * 1.6)
    s += 0.25 * lp_fast(rng.uniform(-1, 1, n), 600) * np.exp(-tt * 6)
    return s


# ---------------- ACT I: the problem (0 – 16) ----------------
# dark drone
n = int(16.2 * SR); tt = np.arange(n) / SR
drone = (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 82.41 * tt + 1) + 0.3 * np.sin(2 * np.pi * 110.3 * tt)
         + 0.18 * np.sin(2 * np.pi * 164.8 * tt * (1 + 0.002 * np.sin(tt))))
drone *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.12 * tt)
drone *= np.minimum(1, tt / 3.0) * np.clip((16.0 - tt) / 0.35, 0, 1)
add(drone, 0, 0.16)
air = lp_fast(rng.uniform(-1, 1, n), 1800) * np.minimum(1, tt / 4) * np.clip((15.9 - tt) / 0.3, 0, 1)
add(air, 0, 0.04, -0.3)

# typing: 90-char prompt between 0.5 and 3.0
PROMPT_LEN = 92
for k in range(PROMPT_LEN):
    at = 0.5 + 2.5 * (k + 0.5) / PROMPT_LEN + rng.normal(0, 0.006)
    add(click(tone=rng.uniform(2200, 4200), gain=rng.uniform(0.5, 0.9)), at, 0.16, rng.uniform(-0.25, 0.25))
add(click(0.03, 1500, 1.4), 3.25, 0.3)

# generation surge 3.5 – 6.0: rising filtered noise + sweep
n = int(3.0 * SR); tt = np.arange(n) / SR
sweep_f = 180 * 2 ** (tt * 1.4)
sweep = np.sin(2 * np.pi * np.cumsum(sweep_f) / SR) * 0.4
noise = lp_fast(rng.uniform(-1, 1, n), 4200)
surge = (sweep + noise * 0.8) * (tt / 3.0) ** 2 * np.clip((3.0 - tt) / 0.12, 0, 1)
add(surge, 3.4, 0.10)
# rapid ticks of "words" appearing
for k in range(70):
    at = 3.5 + 2.2 * (k / 70) ** 0.7
    add(click(0.01, 5200, 0.5), at, 0.07, rng.uniform(-0.8, 0.8))
add(boom(1.6), 5.8, 0.28)  # low hit under "eleven seconds"

# detector cards
for i in range(8):
    add(bell(midi(88 + (i % 3) * 2), 0.4) * 0.5, 8.5 + i * 0.09, 0.05, -0.6 + i * 0.17)
for run in range(3):
    base = 9.2 + run * 1.5
    for j in range(14):  # jitter chatter while the score flickers
        add(click(0.012, rng.uniform(3000, 7000), 0.6), base + j * 0.038, 0.07, rng.uniform(-0.9, 0.9))
    add(bell(midi(64 - run), 1.2), base + 0.55, 0.05)
# heartbeat / clock tension 8.6 – 13.6
for k, at in enumerate(np.arange(8.6, 13.65, 0.5)):
    add(click(0.02, 900, 1.0), at, 0.22)
    if k % 2 == 0:
        add(boom(0.5), at, 0.10)
# stamp impact
add(boom(3.0), 13.7, 0.55)
add(bell(midi(45), 3.0), 13.7, 0.08)

# ---------------- ACT II: "Ask them." (16 – 29) ----------------
D = [midi(50), midi(57), midi(62), midi(66)]      # D3 A3 D4 F#4
add(pad(D + [midi(76)], 8.2, attack=2.2, release=2.5, bright=0.6), 16.1, 0.32)
add(bell(midi(74), 5), 19.45, 0.17, -0.15)   # D5 on "Ask them."
add(bell(midi(69), 5), 19.55, 0.11, 0.2)
add(bell(midi(81), 3), 21.35, 0.035, 0.3)    # gloss
# wordmark
add(pad([midi(43), midi(50), midi(59), midi(62), midi(66)], 5.6, attack=0.6, release=2.0, bright=0.8), 24.0, 0.28)  # Gmaj7-ish
for m, dt, p in [(74, 0.0, -0.2), (78, 0.08, 0.1), (81, 0.16, 0.3), (86, 0.30, 0.0)]:
    add(bell(midi(m), 4) * 0.8, 24.25 + dt, 0.07, p)

# ---------------- ACT III: product (29.4 – 62.4) ----------------
BPM = 100; beat = 60 / BPM; bar = beat * 4
prog = [  # (root pad notes, arpeggio notes)
    ([50, 57, 62, 66], [62, 66, 69, 74, 69, 66, 69, 74]),   # D
    ([47, 54, 59, 62], [59, 62, 66, 71, 66, 62, 66, 71]),   # Bm
    ([43, 55, 59, 62], [59, 62, 67, 71, 67, 62, 67, 71]),   # G
    ([45, 52, 57, 61], [57, 61, 64, 69, 64, 61, 64, 71]),   # A
]
t0 = 29.4
nbars = int((62.4 - t0) / bar) + 1
for b in range(nbars):
    at = t0 + b * bar
    if at >= 62.2:
        break
    padn, arp = prog[b % 4]
    add(pad([midi(m) for m in padn], bar + 1.2, attack=0.4, release=1.2, bright=0.5), at, 0.13)
    add(np.sin(2 * np.pi * midi(padn[0] - 12) * np.arange(int(bar * SR)) / SR) * env_adsr(int(bar * SR), 0.05, 0.4, 0.6, 0.4), at, 0.09)
    for k, m in enumerate(arp):
        ta = at + k * beat / 2
        if ta < 62.0:
            gain = 0.10 if b > 0 else 0.10 * (k + 1) / 8
            add(pluck(midi(m), 1.0), ta, gain, -0.35 if k % 2 else 0.35)
    # soft pulse on beats 1 & 3 from bar 2
    if b >= 1:
        for q in (0, 2):
            add(boom(0.45) * 0.6, at + q * beat, 0.12)
# UI sound design
for at in (31.0,):
    add(lp_fast(rng.uniform(-1, 1, int(3.4 * SR)), 2500) * np.sin(np.linspace(0, np.pi, int(3.4 * SR))), at, 0.025, 0.4)  # scan
for at in (31.7, 32.4, 33.3, 34.0):
    add(bell(midi(86), 0.6), at, 0.035, 0.5)                           # highlights
for i, at in enumerate((34.4, 35.65, 36.9)):
    add(bell(midi([74, 78, 81][i]), 2.5), at, 0.08, 0.3)              # question groups
add(click(0.03, 1800, 1.3), 52.3, 0.35)                                  # evidence marker click
add(bell(midi(79), 2.5), 52.36, 0.07)
add(click(0.03, 1800, 1.2), 57.0, 0.3)                                   # conclusion radio
add(bell(midi(74), 3), 57.05, 0.06)
add(boom(1.4) * 0.8, 59.7, 0.25); add(bell(midi(86), 3), 59.72, 0.06)  # seal

# ---------------- ACT IV: manifesto & end (62.4 – 75) ----------------
add(pad([midi(m) for m in (43, 50, 55, 59, 62)], 3.8, attack=0.3, release=1.0, bright=0.9), 62.4, 0.2)
add(boom(1.2), 63.6, 0.28); add(boom(1.2), 64.0, 0.28)                  # strikethroughs
add(pad([midi(m) for m in (45, 52, 57, 61, 64, 69)], 3.8, attack=0.2, release=1.2, bright=1.0), 64.4, 0.22)
# riser into resolution
n = int(3.4 * SR); tt = np.arange(n) / SR
riser = lp_fast(rng.uniform(-1, 1, n), 3000) * (tt / 3.4) ** 3
add(riser, 66.0, 0.27)
add(pad([midi(m) for m in (47, 54, 59, 62, 66)], 3.4, attack=0.6, release=0.6, bright=0.9), 66.0, 0.27)
# resolution: D major, long ring
add(boom(3.0), 69.4, 0.45)
add(pad([midi(m) for m in (38, 50, 57, 62, 66, 69, 74)], 5.6, attack=0.05, release=4.0, bright=1.0), 69.4, 0.24)
for m, dt, p in [(74, 0.0, -0.2), (81, 0.12, 0.25), (78, 1.6, 0.1), (86, 1.75, -0.2)]:
    add(bell(midi(m), 5), 69.45 + dt, 0.09, p)

# ---------------- mix: reverb + master ----------------
def reverb(x, seconds=2.6, mix=0.28):
    n = int(seconds * SR)
    ir = rng.uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lp_fast(ir, 5000); ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
    return x * (1 - mix) + y * mix * 2.2

L = reverb(L); R = reverb(R * 1.0)
# gentle global fade out
fade = np.clip((DUR - t_all) / 2.2, 0, 1)
L *= fade; R *= fade
st = np.stack([L, R], 1)
st = np.tanh(st * 1.6) / np.tanh(1.6)       # soft-clip glue
peak = np.abs(st).max(); st *= 0.89 / peak
pcm = (st * 32767).astype(np.int16)
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', peak, 'rms', np.sqrt((st ** 2).mean()))
