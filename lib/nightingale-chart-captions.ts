import raw from './nightingale-chart-captions.json';

type CaptionsJson = {
  presenterDetail: string;
  participantSample: string;
};

const data = raw as CaptionsJson;

export const FLAVOR_NIGHTINGALE_PRESENTER_DETAIL_CAPTION = data.presenterDetail;
export const PARTICIPANT_SAMPLE_RADAR_CAPTION = data.participantSample;
