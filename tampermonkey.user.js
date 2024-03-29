// ==UserScript==
// @name         MHXX Simulator Syncing
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Sync simulator data between multiple devices.
// @author       DiruSec
// @include      *//*.wiki-db.com/sim/
// @include      *//*.wiki-db.com/sim/?hl=*
// @match        http://*.wiki-db.com/sim/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @run-at       document-start
// @grant        window.close
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/DiruSec/MHXX-Simulator-Sync/master/tampermonkey.user.js
// @downloadURL  https://raw.githubusercontent.com/DiruSec/MHXX-Simulator-Sync/master/tampermonkey.user.js
// ==/UserScript==

(function() {
    'use strict';
    var data = {}
    var autosync = GM_getValue("autosync")==undefined? false : GM_getValue("autosync")
    var syncid = GM_getValue("syncid")
    var syncurl = GM_getValue("syncurl")

    if (autosync){
        syncFromServer()

        window.onbeforeunload = function() {
            doPromise();
            return '关闭提示';
        };
    }

    GM_registerMenuCommand("设置服务器URL", setSyncURL)
    GM_registerMenuCommand("设置同步ID", setSyncID)
    GM_registerMenuCommand("同步到服务器", syncToServer)
    GM_registerMenuCommand("同步到本地", syncFromServer)
    GM_registerMenuCommand("切换自动同步状态", switchAutoSync)
    // GM_registerMenuCommand("显示同步ID", showSyncID)
    // GM_registerMenuCommand("获取同步数据", getSyncData)
    // GM_registerMenuCommand("保存后关闭", doPromise)



    function switchAutoSync(){
        if (autosync){
            window.onbeforeunload = function() {};
            autosync = false
        } else {
            window.onbeforeunload = function() {
                doPromise();
                return '关闭提示';
            };
            autosync = true
        }

        GM_setValue("autosync", autosync)
        sentMessage("","自动同步已"+(autosync?"开启":"关闭"));
    }

    function getCurrentTools(){
        return document.location.host.split(".")[0]
    }

    function getLocalStorage(){
        for (var i=0; i<localStorage.length; i++){
            var key = localStorage.key(i);
            var content = localStorage.getItem(key);
            data[key] = content;
        }
    }

    function setSyncID(){
        var mess = "请输入同步ID";
        var caseShow = syncid;
        var getSetData = prompt(mess, caseShow);

        // 坑：window.prompt 点击 cancel 时返回null
        syncid = (getSetData===null? syncid : getSetData)
        GM_setValue("syncid", syncid)
    }

    function setSyncURL(){
        var mess = "请输入服务器URL";
        var caseShow = syncurl;
        var getSetData = prompt(mess, caseShow);
        syncurl = (getSetData===null? syncurl : getSetData)
        GM_setValue("syncurl", syncurl);
    }

    function saveToLocalStorage(data){
        for (var key in data){
            console.log(key, data[key])
            localStorage.setItem(key, data[key])
        }
    }

    function syncToServer(){
        if (!checkSyncVaild()){return false};

        GM_xmlhttpRequest({
            method: "POST",
            url: syncurl,
            headers: {"Content-type": "application/json; charset=UTF-8"},
            data: JSON.stringify({
                data: data,
                mode: "send",
                tool: getCurrentTools(),
                syncid: syncid
            }),
            onload: function(responseDetails){
                if (responseDetails.status == 200){
                    let responseJSON = JSON.parse(responseDetails.responseText)
                    let status = responseJSON.status
                    let message = responseJSON.message
                    sentMessage(status,message)
                } else {
                    sentMessage("Failed!", "HTTP " + responseDetails.status)
                }
            },
            onerror: function(responseDetails){
                sentMessage("Failed!", "HTTP " + responseDetails.status)
            }
        })
    }

    function syncFromServer(){
        if (!checkSyncVaild()){return false};

        GM_xmlhttpRequest({
            method: "POST",
            url: syncurl,
            dataType: "json",
            headers: {"Content-type": "application/json; charset=UTF-8"},
            data: JSON.stringify({
                data: data,
                mode: "receive",
                tool: getCurrentTools(),
                syncid: syncid
            }),
            onload: function(responseDetails){
                var responseJSON = JSON.parse(responseDetails.responseText)
                var status = responseJSON.status
                var message = responseJSON.message
                if (responseDetails.status == 200 && status == 'success'){
                    let data = responseJSON.data
                    sentMessage(status,message)
                    saveToLocalStorage(data)
                } else if (responseDetails.status == 200){
                    sentMessage(status,message)
                } else {
                    sentMessage("Failed!", "HTTP " + responseDetails.status)
                }
            },
            onerror: function(responseDetails){
                sentMessage("Failed!", "HTTP " + responseDetails.status)
            }
        })
    }

    function checkSyncVaild(){
        getLocalStorage()
        if (data.length < 1){
            sentMessage("Failed!","没有可同步的数据");
            console.log("Failed at validating data.")
            return false
        }
        if (syncid == ""){
            sentMessage("Failed!","未指定同步ID");
            console.log("Failed at validating syncid.")
            return false
        }
        if (syncurl == "" || syncurl === null){
            sentMessage("Failed!","未指定服务器URL");
            console.log("Failed at validating syncurl.")
            return false
        }
        return true;
    }

    function showSyncID(){
        alert(syncid)
    }

    function getSyncData(){
        getLocalStorage()
        console.log(JSON.stringify(data))
    }

    //TODO: promise响应非HTTP 200
    function doPromise(){
        if (autosync == false){
            return false
        }

        var promise = new Promise((resolve) =>{
            syncToServer()
            resolve("complete")
        })
        promise.then((resolveMsg) =>{
            // promise 完成后取消关闭确认对话框
            window.onbeforeunload = null;
        })
    }

    function sentMessage(result,text){
        var notificationDetails = {
            title:      "Sync " + result,
            text:       text,
            timeout:    3000,
          };
        GM_notification (notificationDetails);
    }
})();
