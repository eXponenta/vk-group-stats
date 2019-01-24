//Список Ваших токенов для доступа к API ВК (токен приложения)
var Tokens = [	'227b77f1227b77f1227b77f1b8221c8a3a2227b227b77f17e43f3ee1c179ebd44344710',
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

//Вк использует специальную систему, при которой изменение страницы не обновляет страницу.
// Этой проблеме я посвеещаю следующий костыль

//слушатель изменения содержимого окна
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var PREW_DATE=0;
var PREW_HREF;
var observer = new MutationObserver(function(mutations, observer) {
    //если между двумя послеедними изменениями url был изменен (перешли в другую группу), то вызываем функцию foc();
    if ( (new Date())-PREW_DATE >1000 && PREW_HREF != location.href) {
        PREW_HREF = location.href;
        PREW_DATE=new Date();
        foc(0);
    }
});

observer.observe(document, {
    subtree: true,
    attributes: true
    //...
});
window.onload = foc(0);

//тут мы выполняем запрос к API, вычисляем результат и выводим его на панельку.
 function foc(DEEP) {
	 API_ACCESS_TOKEN = Tokens[CurTok];
	 
    storage.get("FORMULA", function(it) {
        if (it.FORMULA != null) {
            FORMULA = it.FORMULA;
        } else {
            storage.set({
                "FORMULA": FORMULA
            }, function() {});
        }
    });
    storage.get("POSTS", function(it) {
        if (it.POSTS != null) {
            POST_COUNT = parseInt(it.POSTS,10);
			
        } else {
            storage.set({
                "POSTS": POST_COUNT
            }, function() {});
        }
    });
    var cont = document.getElementById('narrow_column'); // стоит с самого начала убедится в том, что игра стоит свеч: если на странице нету панели, то не нужно тратить запрос (их и так всего 5000 за сутки)

    /*if(location.href.indexOf("https://oauth.vk.com/blank.html#error")==0)//тут тоже небольшой костыль для авторизации в ВК
    {
    	window.location.href = "https://vk.com/feed";
    }
    if(location.href.indexOf("https://oauth.vk.com/blank.html#access_token=")==0)//тут тоже небольшой костыль для авторизации в ВК
    {
    	API_ACCESS_TOKEN = location.href.substr(location.href.indexOf("=")+1,location.href.indexOf("&")-location.href.indexOf("=")-1);
    	setCookie("CLIENT_ACCESS_KEY", API_ACCESS_TOKEN);
    	setCookie("CLIENT_ACCESS_TIME", ""+((new Date()).getTime()+86400000));
        window.location.href = "https://vk.com/feed";	 
    	IS_REG=true;
    }*/

    //далее мы проверим, является ли текущая страница группой

    var NAM = location.pathname; // мы получаем поддомен (в идеале это название группы или профиля ВК)
    if (NAM.indexOf("/") == 0) //если начинается со слеша, то слеш удаляем
    {
        NAM = NAM.substr(1);
    }

    var IS_GROUP_REQ = new XMLHttpRequest();
    var IS_USER_REQ = new XMLHttpRequest();

    if (NAM.indexOf('club') == 0 && !isNaN(parseInt(NAM.substr(4)))) {
        IS_GROUP_REQ.open('GET', 'https://api.vk.com/method/groups.getById?group_id=' + NAM.substr(4) + '&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
    } else {
        IS_GROUP_REQ.open('GET', 'https://api.vk.com/method/groups.getById?group_id=' + NAM + '&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
    }
    if (NAM.indexOf('id') == 0 && !isNaN(parseInt(NAM.substr(2)))) {
        IS_USER_REQ.open('GET', 'https://api.vk.com/method/users.get?user_ids=' + NAM.substr(2) + '&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
    } else {
        IS_USER_REQ.open('GET', 'https://api.vk.com/method/users.get?user_ids=' + NAM + '&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
    }
    IS_GROUP_REQ.send();
    IS_USER_REQ.send();
    var NON = true;
    if (IS_GROUP_REQ.status != 200) { //ловим ошибку
    } else {
        var jsn_grp = JSON.parse(IS_GROUP_REQ.responseText);
        if (jsn_grp.error == null) NON = false;
    }
    if (IS_USER_REQ.status != 200) { //ловим ошибку
    } else {
        var jsn_grp = JSON.parse(IS_USER_REQ.responseText);
        if (jsn_grp.error == null) NON = false;
    }
    if (NON) return;
    //мы уверены, что точно на странице профиля или сообщества
    if (cont != null && location.hostname == VK_DOMAIN && IS_REG) {

        //авторизируем пользователя (используя "инкогнито" ключ инфу дадут не все группы)

        /*
		//начало костыля для авторизации в ВК
		ACCES_TIME=parseInt(getCookie('CLIENT_ACCESS_TIME')); //получаем дату "смерти" токена из куки
		
		if(ACCES_TIME==null || ACCES_TIME-(new Date()).getTime()<0)//если время жизни токена истекло, то мы должны попросить ВК дать новый.
		{
			API_ACCESS_TOKEN==null;
			deleteCookie("CLIENT_ACCESS_KEY");
		}
		
	 	if(API_ACCESS_TOKEN==null){ //если за сессию токен еще не был получен
		API_ACCESS_TOKEN=getCookie('CLIENT_ACCESS_KEY');//берем токен из куки
         if(API_ACCESS_TOKEN==null)// если в куки тоже небыло токена, то наченаем запрос нового токена у ВК (то самое моргание на 0,5 секунд)
		 {
			 IS_REG=false;
			 var AUT_URL="https://oauth.vk.com/authorize?client_id="+CLIENT_ID+"&display=page&redirect_uri=https://oauth.vk.com/blank.html&response_type=token&v=5.92";
			window.location.href = AUT_URL;
		 }
		}//конец костыля для авторизации в ВК*/

        //	if(API_ACCESS_TOKEN!=null){		

        //готовим https запрос для api
        var xhr2 = new XMLHttpRequest(); //этот запрос вернет количество подписчиков.    


       
        // готовим запрос GET для API метода wall.get. В результате мы получаем JSON объект, в котором хранится информация о 100 последних постах

        if (NAM.indexOf('club') == 0 && !isNaN(parseInt(NAM.substr(4)))) {
            xhr2.open('GET', 'https://api.vk.com/method/groups.getMembers?group_id=' + NAM.substr(4) + '&count=0&offset=0&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
        } else {
            xhr2.open('GET', 'https://api.vk.com/method/groups.getMembers?group_id=' + NAM + '&count=0&offset=0&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
        }

        var JSN_OBJ2;
        var followers = null;

        xhr2.send();
        if (xhr2.status != 200) { //ловим ошибку
            return;
        } else { //ошибки нет
            JSN_OBJ2 = JSON.parse(xhr2.responseText); // превращаем JSON текст в объект класса JSON
            if (JSN_OBJ2.response != null && JSN_OBJ2.response.count != null) {
                followers = parseInt(JSN_OBJ2.response.count, 10);
            }
            if (JSN_OBJ2.error != null) {
                //	 alert(JSN_OBJ2.error.error_code+"\n"+JSN_OBJ2.error.error_msg);
            }
        }
            var NOW_SEC = (new Date()).getTime() / 1000;
           
            var views = 0;
            var likes = 0;
            var reposts = 0;
            var comments = 0;
            var COUNT = 0;
			var OFFSET=1; //если вы хотите учитывать закрепленный пост, то оставте 0. Если нужно исключить закрепленный пост из расчета, то сделайте равным 1
            var NO_STOP = true;
			var RATE_lim=false;
 
            while (NO_STOP && COUNT<=POST_COUNT) {//с помощью цикла получаем нужное количество постов. 

                var xhr = new XMLHttpRequest(); //этот запрос вернет посты.
                if (NAM.indexOf('club') == 0 && !isNaN(parseInt(NAM.substr(4)))) {
                    xhr.open('GET', 'https://api.vk.com/method/wall.get?owner_id=-' + NAM.substr(4) + '&count=100&offset=' + (OFFSET+COUNT) + '&filter=owner&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);

                } else {
                    xhr.open('GET', 'https://api.vk.com/method/wall.get?domain=' + NAM + '&count=100&offset=' + (OFFSET+COUNT) + '&filter=owner&access_token=' + API_ACCESS_TOKEN + '&v=5.92', false);
                }

                var JSN_OBJ;
                xhr.send();
                if (xhr.status != 200) { //ловим ошибку
                    return;
                } else { //ошибки нет
                    JSN_OBJ = JSON.parse(xhr.responseText); // превращаем JSON текст в объект класса JSON
                }
				if(JSN_OBJ.error!=null&&JSN_OBJ.error.error_code==29)
				{
					RATE_lim=true;
					break;
				}
				var mass = JSN_OBJ.response.items; //получаем массив постов от JSON
				
				if(mass == null){return;}
				
                for (var i = 0; i < mass.length; i++) { //суммируем все лайки, репосты, комментарии и просмотры

                    if (mass[i].views != null && NOW_SEC - parseInt(mass[i].date, 10) <= 31557600) { //В старых версиях ВК не было просмотров и посты просто не хранят данных о количестве посмотревших
                        views += mass[i].views.count;
                        likes += mass[i].likes.count;
                        comments += mass[i].comments.count;
                        reposts += mass[i].reposts.count;
                        COUNT++;
                    } else {
                        NO_STOP = false;
						break;
                    }
					if(COUNT>=POST_COUNT){
                        NO_STOP = false;
						break;}
                }
            }
			var in_html;
			
			if(RATE_lim)
			{
				if(DEEP<=Tokens.length)
				{
					CurTok++;
					if(CurTok >= Tokens.length){CurTok=0;}
					foc(DEEP+1);
					return;
				}
				else{
				in_html = "статистика<br><hr>Извините, но на сегоднежний день лимит для запроса wall.get уже исчерпан :(<hr><br>";
				}
			}			
			else{
			
            /*--- ФОРМУЛА ---*/
            var forml = FORMULA;
            forml = forml.replace(new RegExp("lik", 'g'), likes);
            forml = forml.replace(new RegExp("com", 'g'), comments);
            forml = forml.replace(new RegExp("rep", 'g'), reposts);
            forml = forml.replace(new RegExp("vie", 'g'), views);

            //var ER = (likes + 1.5 * reposts + 2.5 * comments) / views*100; //рассчитываем коэффециент популярности.
            var ER = eval(forml);
            var medium_views = views / COUNT;
            var medium_likes = likes / views * 100;
            var medium_comments = comments / views * 100;
            var medium_reposts = reposts / views * 100;



            // начинается самое интересное: мы добавляем результат вычислений на панельку в ВК
            var html_vie_foll = "";

            if (followers != null) {
                html_vie_foll = " (" + (medium_views / followers * 100).toFixed(2) + "%)";
            }

            var like_img_src = 'data:image/svg+xml;charset=utf-8,<svg%20xmlns%3D"http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg"%20viewBox%3D"0%200%2024%2024"%20height%3D"100%25"%20width%3D"100%25"><title>like_outline_24<%2Ftitle><path%20d%3D"M0%2C0H24V24H0Z"%20fill%3D"none"%2F><path%20d%3D"M17%2C2.9A6.43%2C6.43%2C0%2C0%2C1%2C23.4%2C9.33c0%2C3.57-1.43%2C5.36-7.45%2C10l-2.78%2C2.16a1.9%2C1.9%2C0%2C0%2C1-2.33%2C0L8.05%2C19.37C2%2C14.69.6%2C12.9.6%2C9.33A6.43%2C6.43%2C0%2C0%2C1%2C7%2C2.9a6.46%2C6.46%2C0%2C0%2C1%2C5%2C2.54A6.46%2C6.46%2C0%2C0%2C1%2C17%2C2.9ZM7%2C4.7A4.63%2C4.63%2C0%2C0%2C0%2C2.4%2C9.33c0%2C2.82%2C1.15%2C4.26%2C6.76%2C8.63l2.78%2C2.16a.1.1%2C0%2C0%2C0%2C.12%2C0L14.84%2C18c5.61-4.36%2C6.76-5.8%2C6.76-8.63A4.63%2C4.63%2C0%2C0%2C0%2C17%2C4.7c-1.56%2C0-3%2C.88-4.23%2C2.73L12%2C8.5l-.74-1.07C10%2C5.58%2C8.58%2C4.7%2C7%2C4.7Z"%20fill%3D"%23828a99"%2F><%2Fsvg>';
            var comments_img_src = 'https://vk.com/images/svg_icons/comment_outline_24.svg';
            var reposts_img_src = 'https://vk.com/images/svg_icons/share_outline_24.svg';
            var views_img_src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2210%22%20viewBox%3D%221%202%2014%2010%22%20style%3D%22fill%3A%23828a99%3B%22%3E%3Cpath%20d%3D%22M8%2012C3.8%2012%201%208%201%207%201%206%203.8%202%208%202%2012.2%202%2015%206%2015%207%2015%208%2012.2%2012%208%2012ZM8%2010.5C9.9%2010.5%2011.5%208.9%2011.5%207%2011.5%205.1%209.9%203.5%208%203.5%206.1%203.5%204.5%205.1%204.5%207%204.5%208.9%206.1%2010.5%208%2010.5ZM8%208.6C7.1%208.6%206.4%207.9%206.4%207%206.4%206.1%207.1%205.4%208%205.4%208.9%205.4%209.6%206.1%209.6%207%209.6%207.9%208.9%208.6%208%208.6Z%22%2F%3E%3C%2Fsvg%3E';

            var hint_ic = '<span class="hint_icon" title="рассчитывается по формуле ER=' + FORMULA.replace(new RegExp("lik", 'g'), '∑лайков').replace(new RegExp("com", 'g'), '∑комментариев').replace(new RegExp("rep", 'g'), '∑репостов').replace(new RegExp("vie", 'g'), '∑просмотров') + '"></span>'
            //  var hint_ic="";

            in_html = "<div>Статистика<span style='float: right; cursor: pointer;'><a title='обновить' onclick='foc(0)'><img height='14px' src='" + chrome.extension.getURL('/update.png') + "'></a></span></div><div style='padding : 3px; color: #2a5885; margin-top: 15px; margin-left: 10px;'><div width='100%' style='margin-bottom: 15px;'><span>последние <span style='color:#939393 ;'>" + COUNT + "</span> постов</span></div><div title='∑ лайков (лайки/подписчики*100%)' width='100%' style='margin-bottom: 15px;'><span><img height='16px' src='" + like_img_src + "'></span><span style='float: right; color:#939393 ;'>" + likes.toLocaleString('ru') + " (" + medium_likes.toFixed(2) + "%)</span></div><div title='∑ комментариев (комментарии/подписчики*100%)' width='100%' style='margin-bottom: 15px;'><span ><img height='16px' src='" + comments_img_src + "'></span><span style='float: right; color:#939393 ;'>" + comments.toLocaleString('ru') + " (" + medium_comments.toFixed(2) + "%)</span></div><div width='100%' style='margin-bottom: 15px;' title='∑ репостов (репосты/подписчики*100%)'><span ><img height='16px' src='" + reposts_img_src + "'></span><span style='float: right; color:#939393 ;'>" + reposts.toLocaleString('ru') + " (" + medium_reposts.toFixed(2) + "%)</span></div><div width='100%' style='margin-bottom: 15px;' title='∑ просмотров'><span ><img  height='13px' src='" + views_img_src + "'></span><span style='float: right; color:#939393 ;'>" + views.toLocaleString('ru') + "</span></div><div width='100%' title='среднее количество просмотров на пост (количество просмотров на пост/количество подписчиков*100%'><span>просм/пост:</span><span style='float: right; color:#939393 ;'>" + Math.round(medium_views).toLocaleString('ru') + html_vie_foll + "</span></div><hr><div width='100%)' style='margin-bottom: 15px;'><span><b>ER:</b></span><span style='float: right; color:#939393 ;'><b>" + ER.toFixed(2) + "%</b>" + hint_ic + "</span></div></div>";
		}
            //проверяем, нет ли уже на странице нашего элемента
            var dv = document.getElementById('ER_RATE_COUNTER_DIV');
            if (dv == null) { //если нет, то создадим

                //создаем и настраиваем свой div
                var div = document.createElement('div');
                div.id = "ER_RATE_COUNTER_DIV";
                div.classList.add("page_block");
                div.classList.add("page_photo");
                div.classList.add("page_action_menu_groups");
                div.style = "word-wrap: normal; padding:15px 15px 0px 5px;";
                //тут выводим результат вычислений
                div.innerHTML = in_html;
                cont.insertBefore(div, cont.children[1]);

            } else //если наш элемент уже существует, то просто выведем результат вычислений на него
            {
                //тут выводим результат вычислений	
                dv.innerHTML = in_html;
            }
        
        //}
    }
}

// подгружаем формулу из настроек
chrome.storage.onChanged.addListener(function() {
    storage.get("FORMULA", function(it) {
        FORMULA = it.FORMULA;
    });
    storage.get("POSTS", function(it) {
         POST_COUNT = parseInt(it.POSTS,10);
    });
	foc(0);
});


// эти методы для работы с куки я просто скопировал из интернета)))
function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options) {
    options = options || {};
    options.domain = ".vk.com";
    var expires = options.expires;

    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }

    value = encodeURIComponent(value);

    var updatedCookie = name + "=" + value;

    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
}

function deleteCookie(name) {
    setCookie(name, "", {
        expires: -1
    })
}