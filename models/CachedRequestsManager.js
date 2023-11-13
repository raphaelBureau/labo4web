import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";
import {log} from "../log.js";
import {v4} from 'uuid';
let repositoryCachesExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

globalThis.cache = []; //request cache contient {url: "", content: "", Etag= "", TTL: n}

export default class CachedRequestsManager{
    static add(url = "", content = "", ETag = "") {
        if(url != "") { //content peut etre vide
            CachedRequestsManager.clear(url);
            if(ETag == "") {
                ETag = v4(); // generate ETag
            }
            let req = {content,ETag,TTL: utilities.nowInSeconds() + repositoryCachesExpirationTime,url};
            cache.push(req);
            log("SUCCES: CachedRequestsManager.add(), url: " + url + ", added to cache. TTL: " + req.TTL + ".");
        }
        else{//error: url empty or undefined
            log("ERROR: CachedRequestsManager.add(), url empty or undefined.");
        }
    }
    static find(url = "") { //pas oublier de verifier ETag
        if(url != "") {
            for(let req of cache) {
                if(req.url == url) {
                    req.TTL = utilities.nowInSeconds() + repositoryCachesExpirationTime;
                    log("SUCCES: CachedRequestsManager.find(), url: " + url + ", fetched from cache. new TTL: " + req.TTL + ".");
                    return req;
                };
            }
            log("ERROR: CachedRequestsManager.find(), cached url not found.");
        }
        else{//error: url empty or undefined
            log("ERROR: CachedRequestsManager.find(), url empty or undefined.");
        }
        return undefined;
    }
    static clear(url) {
        if(url != "") {
            for(let i in cache) {
                if(cache[i].url.toLowerCase().indexOf(url.toLowerCase()) > -1) {
                    log("SUCCES: CachedRequestsManager.clear(), cached request removed.");
                    cache.splice(i, 1);
                    return;
                }
            }
            log("ERROR: CachedRequestsManager.clear(), cached request not found.");
        }
        else{//error: url empty or undefined
            log("ERROR: CachedRequestsManager.clear(), url empty or undefined.");
        }
    }
    static flushExpired() {
        let expiredIndexes = [];
        for(let i in cache) {
            if(cache[i].TTL < utilities.nowInSeconds()) {
                expiredIndexes.push(i);
                log("SUCCES: CachedRequestsManager.flushExpired(), url: " + cache[i].url + " expired, TTL: " + cache[i].TTL);
            }
        }
        if(expiredIndexes.length > 0) {
        log("SUCCES: CachedRequestsManager.flushExpired(), deleted: " + expiredIndexes.length + ", cached requests.");
        utilities.deleteByIndex(cache,expiredIndexes);
        }
    }
    static get(HttpContext) {
        //HttpContext.response.JSON( paylod, ETag, true /* from cache */)
        let req = CachedRequestsManager.find(HttpContext.req.url);
        if(req != undefined) {
            log("SUCCES: CachedRequestsManager.get(), url: " + req.url + ", fetched from cache.");
            HttpContext.response.JSON(req.content, req.ETag, true);
            return true;
        }
        else{
        log("WARN: CachedRequestsManager.get(), url: " + HttpContext.req.url + ", not found in cache.");
        return false;
        }
    }
}

setInterval(CachedRequestsManager.flushExpired, repositoryCachesExpirationTime * 1000);
log(BgWhite, FgBlack, "Periodic repository caches cleaning process started...");
