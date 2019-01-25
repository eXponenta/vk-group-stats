//Список Ваших токенов для доступа к API ВК (токен приложения)
var Tokens = [  '58eb554658eb554658eb5546d8588cada5558eb58eb554604dc66e3469d0acc0894a5fb',
            	'227b77f1227b77f1227b77f1b8221c8a3a2227b227b77f17e43f3ee1c179ebd44344710',
				'b38ace8bb38ace8bb38ace8b91b3e2eefbbb38ab38ace8befcb77aca07bbfbedef17505',
				'fea3652ffea3652ffea3652ff9fecb4552ffea3fea3652fa2e2d9895abe71783b9695d7',
				'9e91edd69e91edd69e91edd6fe9ef9cc9e99e919e91edd6c2d00d82662e542b26f93d66',
				'65175abd65175abd65175abdfd657f7bef6651765175abd3956bb1d579161e679c65fa6',
				'd700baf0d700baf0d700baf0aed7659742dd700d700baf08c46179d06f4b53a950d06f9',
				'3dccbb243dccbb243dccbb24603dacfa5d33dcc3dccbb2467f10fc843946f2bc43c772c',
				'be2f513dbe2f513dbe2f513d3bbe7189eebbe2fbe2f513de7f21ba46d8849d2c0f03dbd',
				'e56db1dde56db1dde56db1dd14e57061f0ee56de56db1ddb92c57ed593649d33deb32e7',
				'a632e070a632e070a632e07096a65ac1a0aa632a632e070fa73146ce8fa76d533bf7d04',
				'f1a40e4cf1a40e4cf1a40e4c5df1cc2d70ff1a4f1a40e4cade63571f3ef90b1fce09174',
				'c1427e6cc1427e6cc1427e6ce7c12a5206cc142c1427e6c9d06adf1f9e9610efd4a995b',
				];
var CurTok = 0;
/*--- 
		формула редактируется следующим способом:      
			пишите вырожение по законам алгебры в места, 
			где нужно подставить данные пишите                         
			лайки - lik; коменты - com; репосты - rep; просмотры - vie. 
			если вы допустите ошибку, то панель просто не появится.
---*/

var FORMULA = '(lik + 3 * rep + 5 * com) / vie * 100'; //формула
var POST_COUNT = 1000; // количество загружаемых постов 

var storage = chrome.storage.sync;
const VK_DOMAIN = "vk.com"; //домен ВК
var API_ACCESS_TOKEN; 
const CLIENT_ID = "6815179"; //ID вашего приложения ВК
var IS_REG = true;
var ACCES_TIME = 0;

(function() {
    'use strict';
    var IGNORE_PINNED = true;
    var IGNORE_ADS = true;
    var LIKIES_COEF = 1;
    var REPOSTS_COEF = 1.5;
    var COMMENTS_COEF = 2.5;
    var MAX_POSTS = 100; //100 - maximum
    var MAX_DELTA_DAYS = 60;

    var APP_ID = 6813923;
    var TEMPLATE = `
<aside aria-label="Стaтистика">
<div class="module_header">
<div class="header_top clean_fix">
<span class="header_label fl_l">Статистика</span>
</div>
</div>

<div class="module_body" id="loader" style="display:block; text-align:center;">
<span class="header_label progress_inline"></span>
</div>
<div class="module_body module_header" id="data_block" style="display:none;"></div>
</div>

</aside>`;

    var API;
    var latestGroupName = "";
    var latestGroupID = 0;
    var elem;

    if(window.VKChekerInit) return;

    function calcER(likes, reposts, comments, views, days) {
        return 100 * (likes * LIKIES_COEF + reposts * REPOSTS_COEF + comments * COMMENTS_COEF) / views;
    }

    function crtItm(name, value, style) {
        return `<div class="page_actions_item" style = "${style || ""}">
<span id="label" class="header_label" style="display:inline-block;">${name}:</span>
<span id="value" class="header_count fl_r" style="display:inline-block;">${value.toLocaleString()}</span>
</div>`;
    }

    function updateStatView(stat) {

        var text = crtItm("Период", stat.period + " д.");
        text += crtItm("Лайков", stat.likes);
        text += crtItm("Комментариев", stat.comments);
        text += crtItm("Репостов", stat.reposts);
        text += crtItm("Просмотров", stat.views);
        text += crtItm("ER",
                       calcER(stat.likes, stat.reposts, stat.comments, stat.views, stat.period).toFixed(2)
                        + "%"
                       ,"font-weight:bolder; border-top:1px #939393 solid;");
        elem.querySelector("#data_block").innerHTML = text;
    }

    // update stats
    function updateGroupStats(id) {

        var loader_elem = elem.querySelector("#loader");
        var data_elem = elem.querySelector("#data_block");

        loader_elem.style.display = "block";
        data_elem.style.display = "none";

        var now = new Date();

        VKREST.wall.get({owner_id:-id, count:MAX_POSTS, extended: 1}).then((r) => {
            if(r.response) {

                var data = r.response;
                var posts = data.items;
                // if(posts.length < 100) {
                posts = posts.filter((item) =>{
                    var data = new Date(1000 * item.date);
                    var deltaDays = Date.daysBetween(data, now);
                    if(IGNORE_PINNED && item.is_pinned || IGNORE_ADS && item.marked_as_ads) return false;
                    return deltaDays < MAX_DELTA_DAYS;
                });
                // }

                if(posts.length == 0) {
                    return;
                }

                posts = posts.sort((a,b) => {
                    return b.date - a.date;
                });

                var stat = {
                    lastPost: new Date(1000 * posts[0].date),
                    firstPost: new Date(1000 * posts[posts.length - 1].date),
                    likes: 0,
                    comments: 0,
                    reposts: 0,
                    views: 0
                }
                stat.period = Date.daysBetween(stat.firstPost, stat.lastPost);

                posts.forEach((p) =>{
                    stat.likes += p.likes.count;
                    stat.comments += p.comments.count;
                    stat.reposts += p.reposts.count;
                    stat.views += p.views ? p.views.count : 0; // может отсутствовать
                });

                for(var p in stat) {
                    console.log(p+ ":" +stat[p] );
                }

                loader_elem.style.display = "none";
                data_elem.style.display = "block";

                updateStatView(stat);

            } else {
                console.log("Error get data:", id, r);
            }
        });
    }

    function injectSidebar() {

        var name = window.location.pathname.replace("/","");
        if(name == latestGroupName){
            return false;
        }

        var parent = document.querySelector("#narrow_column");
        if(!parent){
            if(elem){
                elem.style.display = "none";
            }
            return false;
        }

        latestGroupName = name;

        //check public without name
        if(name.indexOf("public") > -1){
            var tst = name.replace("public", "");
            if(!isNaN(parseInt(tst, 10))){
                name = tst;
            }
        }
        //check club
        if(name.indexOf("club") > -1) {
            tst = name.replace("club", "");
            if(!isNaN(parseInt(tst, 10))){
                name = tst;
            }
        }

        VKREST.groups.getById(name).then((r) =>{
            if(r.response && r.response.length > 0) {
                elem = document.querySelector("#injected_element");
                if(!elem) {
                    elem = document.createElement("div");
                    elem.classList.add("page_block");
                    elem.id = "injected_element";
                    elem.innerHTML = TEMPLATE;
                    parent.insertBefore(elem, parent.children[2]);
                }else {
                    console.log("Show latest injected");
                }
                elem.style.display = "";
                latestGroupID = r.response[0].id;
                updateGroupStats(latestGroupID);
            }else {
                console.log("Owner: " + name + " is'n group");
                if(elem) {
                    elem.style.display = "none";
                }
            }
        });


    }

    console.log("start inject", document.body);
    window.addEventListener("load",() => {

        VKREST.init(APP_ID, Tokens[0]);
        setInterval(injectSidebar.bind(this), 1000);
        console.log("hook page reloading");

    }, false);


    // --- extensions
    Date.daysBetween = function( date1, date2 ) {
        //Get 1 day in milliseconds
        var one_day=1000*60*60*24;

        // Convert both dates to milliseconds
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        var difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms/one_day);
    }
})();