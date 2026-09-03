export type CubeOwner = 'center' | 'human' | 'bot';
export type CubeActor = Exclude<CubeOwner, 'center'>;

export const MAX_CUBE_VALUE = 64;

export function canOfferDouble(
  owner: CubeOwner,
  actor: CubeActor,
  cubeValue: number,
  onePointer: boolean,
) {
  return !onePointer
    && cubeValue < MAX_CUBE_VALUE
    && (owner === 'center' || owner === actor);
}

export function acceptDouble(cubeValue: number, offeredBy: CubeActor) {
  return {
    value: Math.min(cubeValue * 2, MAX_CUBE_VALUE),
    owner: (offeredBy === 'human' ? 'bot' : 'human') as CubeActor,
  };
}

export function gamePoints(result: string, cubeValue: number, onePointer: boolean) {
  if (onePointer) return 1;
  if (result === 'drop') return cubeValue;
  if (result.endsWith('backgammon')) return cubeValue * 3;
  if (result.endsWith('gammon')) return cubeValue * 2;
  return cubeValue;
}
