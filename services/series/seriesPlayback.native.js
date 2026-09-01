import { Meteor } from "../meteor/client.native";

const call = (method, ...args) => new Promise((resolve, reject) => {
  Meteor.call(method, ...args, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
});

export const getSeries = (id) => call("getSerie", id);
export const getSeriesSeasons = (id) => call("getTemporadasSerie", id);
export const getSeasonChapters = (id) => call("getCapitulosTemporada", id);
export const getChapter = (id) => call("getCapitulo", id);
export const prepareChapterPlayback = (id) => call("prepareCapituloPlayback", id);
export const addChapterView = (id) => call("addVistasCapitulo", id);
