let audioContext: AudioContext | undefined

async function initializeAudioContext(): Promise<AudioContext> {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume()
  }
  return audioContext
}

function createNoiseBuffer(
  ac: AudioContext,
  duration: number,
): AudioBufferSourceNode {
  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1 // White noise
  }
  const bs = ac.createBufferSource()
  bs.buffer = buffer
  return bs
}

export async function playAttackSound() {
  const ac = await initializeAudioContext()
  const duration = 0.1
  const noise = createNoiseBuffer(ac, duration)

  // Musically attack with G notes
  const oscillator = ac.createOscillator()
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(196, ac.currentTime)

  // Decay slightly
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.2, ac.currentTime)
  gain.gain.linearRampToValueAtTime(0.01, ac.currentTime + duration)

  noise.connect(gain)
  oscillator.connect(gain)
  gain.connect(ac.destination)

  noise.start()
  oscillator.start()
  noise.stop(ac.currentTime + duration)
  oscillator.stop(ac.currentTime + duration)
}

export async function playWalkSound() {
  const ac = await initializeAudioContext()
  const duration = 0.04
  const noise = createNoiseBuffer(ac, duration)

  const oscillator = ac.createOscillator()
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(220, ac.currentTime)

  const gain = ac.createGain()
  gain.gain.value = duration

  const oscGain = ac.createGain()
  oscGain.gain.value = 0.02

  noise.connect(gain)
  oscillator.connect(oscGain)
  oscGain.connect(gain)
  gain.connect(ac.destination)

  noise.start()
  oscillator.start()
  noise.stop(ac.currentTime + duration)
  oscillator.stop(ac.currentTime + duration)
}

export async function playGallopSound() {
  const ac = await initializeAudioContext()
  const duration = 0.09
  const thumpDuration = 0.025
  // Gallop: two short noise bursts with a low sine accent
  const noise1 = createNoiseBuffer(ac, thumpDuration)
  const noise2 = createNoiseBuffer(ac, thumpDuration)
  const osc = ac.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(160, ac.currentTime)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.08, ac.currentTime)
  gain.gain.linearRampToValueAtTime(0.01, ac.currentTime + duration)

  const oscGain = ac.createGain()
  oscGain.gain.value = 0.03

  noise1.connect(gain)
  noise2.connect(gain)
  osc.connect(oscGain)
  oscGain.connect(gain)
  gain.connect(ac.destination)

  noise1.start()
  noise1.stop(ac.currentTime + thumpDuration)
  const noise2StartTime = ac.currentTime + 0.045
  noise2.start(noise2StartTime)
  noise2.stop(noise2StartTime + thumpDuration)
  osc.start()
  osc.stop(ac.currentTime + duration)
}
