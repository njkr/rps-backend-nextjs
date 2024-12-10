import * as moment from 'moment';

export const formatDateToYYYYMMDD = (): string => {
  return moment().utc().format('YYYY-MM-DD');
};
