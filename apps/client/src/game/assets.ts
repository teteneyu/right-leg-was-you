export type GameImages = {
  body?: HTMLImageElement;
  face?: HTMLImageElement;
  leftArm?: HTMLImageElement;
  rightArm?: HTMLImageElement;
  leftLeg?: HTMLImageElement;
  rightLeg?: HTMLImageElement;
  vacuum?: HTMLImageElement;
  dust?: HTMLImageElement;
  heart?: HTMLImageElement;
  background?: HTMLImageElement;
};

const imageSources: Record<keyof GameImages, string> = {
  body: '/assets/image/body.png',
  face: '/assets/image/face.png',
  leftArm: '/assets/image/l_arm.png',
  rightArm: '/assets/image/r_arm.png',
  leftLeg: '/assets/image/l_leg.png',
  rightLeg: '/assets/image/r_leg.png',
  vacuum: '/assets/image/vacuum.png',
  dust: '/assets/image/dust.png',
  heart: '/assets/image/heart.png',
  background: '/assets/image/stage-background.png'
};

let cachedImages: GameImages | null = null;

export function getGameImages(): GameImages {
  if (cachedImages) {
    return cachedImages;
  }

  cachedImages = {};
  for (const [key, src] of Object.entries(imageSources) as [keyof GameImages, string][]) {
    const image = new Image();
    image.src = src;
    cachedImages[key] = image;
  }
  return cachedImages;
}
