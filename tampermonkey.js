// ==UserScript==
// @name         MHXX Simulator Syncing
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Sync simulator data between multiple devices.
// @author       DiruSec
// @include      *//mhxx.wiki-db.com/sim/
// @match        http://mhxx.wiki-db.com/sim/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @grant        window.close
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    var data = {}
    var syncid = GM_getValue("syncid", "")
    var syncurl = GM_getValue("syncurl", "")
    syncFromServer("foo")

    // 关闭窗口之前保存
    window.onbeforeunload = function() {
        doPromise();
        return '关闭提示';
      };

    GM_registerMenuCommand("设置服务器URL", setSyncURL)
    GM_registerMenuCommand("设置同步ID", setSyncID)
    // GM_registerMenuCommand("显示同步ID", showSyncID)
    // GM_registerMenuCommand("获取同步数据", getSyncData)
    GM_registerMenuCommand("同步到服务器", syncToServer)
    GM_registerMenuCommand("同步到本地", syncFromServer)
    // GM_registerMenuCommand("保存后关闭", doPromise)


    function getLocalStorage(){
        for (var i=0; i<localStorage.length; i++){
            var key = localStorage.key(i);
            var content = localStorage.getItem(key);
            data[key] = eval(content);
        }
    }

    function setSyncID(){
        var mess = "请输入同步ID";
        var caseShow = syncid;
        var getSetData = prompt(mess, caseShow);
        syncid = getSetData;
        GM_setValue("syncid", syncid);
    }

    function setSyncURL(){
        var mess = "请输入服务器URL";
        var caseShow = syncurl;
        var getSetData = prompt(mess, caseShow);
        syncurl = getSetData;
        GM_setValue("syncurl", syncurl);
    }

    function showSyncID(){
        alert(syncid)
    }

    function getSyncData(){
        getLocalStorage()
        console.log(JSON.stringify(data))
    }

    function saveToLocalStorage(data){
        for (var key in data){
            localStorage.setItem(key, JSON.stringify(data[key]))
        }
    }

    function syncToServer(){
        getLocalStorage()
        if (data.length < 1){
            alert("没有可同步的数据");
            return false
        }
        if (syncid == ""){
            alert("没有指定同步ID");
            return false
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: syncurl,
            headers: {"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"},
            data: "data=" + JSON.stringify(data) + "&mode=send&syncid=" + syncid,
            onload: function(responseDetails){
                if (responseDetails.status == 200){
                    let responseJSON = JSON.parse(responseDetails.responseText)
                    let status = responseJSON.status
                    let message = responseJSON.message
                    alert("Sync "+ status +": " + message)
                } else {
                    alert("HTTP " + responseDetails.status + ": Sync Failed")
                }
            },
            onerror: function(responseDetails){
                alert("HTTP " + responseDetails.status + ": Sync Failed")
            }
        })
    }

    function syncFromServer(step){
        if (syncid == ""){
            alert("没有指定同步ID");
            return false
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: syncurl,
            dataType: "json",
            headers: {"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"},
            data: "mode=receive&syncid=" + syncid,
            onload: function(responseDetails){
                var responseJSON = JSON.parse(responseDetails.responseText)
                var status = responseJSON.status
                var message = responseJSON.message
                if (responseDetails.status == 200 && status == 'success'){
                    let data = responseJSON.data[0]
                    if (step == undefined){
                    alert("Sync "+ status +": " + message)
                    }
                    saveToLocalStorage(JSON.parse(data))
                } else if (responseDetails.status == 200){
                    if (step == undefined){
                    alert("Sync "+ status +": " + message)
                }
                } else {
                    alert("HTTP " + responseDetails.status + ": Sync Failed")
                }
            },
            onerror: function(responseDetails){
                alert("HTTP " + responseDetails.status + ": Sync Failed")
            }
        })
    }

    //TODO: promise响应非HTTP 200
    function doPromise(){
        var promise = new Promise((resolve) =>{
            syncToServer()
            resolve("complete")
        })
        promise.then((resolveMsg) =>{
            // promise 完成后取消关闭确认对话框
            window.onbeforeunload = null;
        })
    }
})();