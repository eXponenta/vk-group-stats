//Список Ваших токенов для доступа к API ВК (токен приложения)
var Tokens = [
	"227b77f1227b77f1227b77f1b8221c8a3a2227b227b77f17e43f3ee1c179ebd44344710",
	"b38ace8bb38ace8bb38ace8b91b3e2eefbbb38ab38ace8befcb77aca07bbfbedef17505",
	"fea3652ffea3652ffea3652ff9fecb4552ffea3fea3652fa2e2d9895abe71783b9695d7",
	"9e91edd69e91edd69e91edd6fe9ef9cc9e99e919e91edd6c2d00d82662e542b26f93d66",
	"65175abd65175abd65175abdfd657f7bef6651765175abd3956bb1d579161e679c65fa6",
	"d700baf0d700baf0d700baf0aed7659742dd700d700baf08c46179d06f4b53a950d06f9",
	"3dccbb243dccbb243dccbb24603dacfa5d33dcc3dccbb2467f10fc843946f2bc43c772c",
	"be2f513dbe2f513dbe2f513d3bbe7189eebbe2fbe2f513de7f21ba46d8849d2c0f03dbd",
	"e56db1dde56db1dde56db1dd14e57061f0ee56de56db1ddb92c57ed593649d33deb32e7",
	"a632e070a632e070a632e07096a65ac1a0aa632a632e070fa73146ce8fa76d533bf7d04",
	"f1a40e4cf1a40e4cf1a40e4c5df1cc2d70ff1a4f1a40e4cade63571f3ef90b1fce09174",
	"c1427e6cc1427e6cc1427e6ce7c12a5206cc142c1427e6c9d06adf1f9e9610efd4a995b"
];
//	"58eb554658eb554658eb5546d8588cada5558eb58eb554604dc66e3469d0acc0894a5fb",

("use strict");

const RESERVED = ["im", "groups", "feed", "friends", "video", "docs", "apps"];

let FORMULA = "100 * (likes + 1.5 * reposts + 2 * comments ) / views"; //формула

const storage = chrome.storage.sync;
const IGNORE_PINNED = false;
const IGNORE_ADS = true;

let MAX_POSTS = 100; //100 - maximum
let MAX_DELTA_DAYS = 60;

const INJECTED_TEMPLATE = `
    <aside aria-label="Стaтистика">
    <div class="module_header">
    <div class="header_top clean_fix">
    <span class="header_label fl_l">Статистика</span>
    </div>
    </div>

    <div class="module_body" id="loader" style="display:block; text-align:center;">
    <span class="header_label progress_inline"></span>
    </div>
    <div class="module_body module_header" id="data_block" style="display:none;padding: 15px 5px;"></div>
    </div>

    </aside>`;

(function() {
	let latestGroupName = "";
	let latestGroupID = 0;
	let injectedParentElement;

	function calcER({ likes, reposts, comments, views, period }) {
		let cond = FORMULA.replace(/likes/g, likes);
		cond = cond.replace(/reposts/g, reposts);
		cond = cond.replace(/comments/g, comments);
		cond = cond.replace(/views/g, views);
		cond = cond.replace(/days/g, period);
		return eval(cond);
	}

	function crtItm(name, value, percent, style) {

        let text = value != undefined ? value.toLocaleString() : "";
        if(percent) {
            text += ` (${(100.0 * percent).toFixed(2).toLocaleString()}%)`;
        }

		return `<div class="page_actions_item" style = "${style || ""}">
            <span id="label" class="header_label" style="display:inline-block;">${name}:</span>
            <span id="value" class="header_count fl_r" style="display:inline-block;">${text}</span>
            </div>`;
	}

	function updateStatView(stat) {
		let text = crtItm("Период", Math.round(stat.period) + " д.");
		text += crtItm("Постов за период", stat.posts);
		text += crtItm("Лайков", stat.likes, stat.likes / stat.users);
		text += crtItm("Коммeнты", stat.comments, stat.comments / stat.users);
		text += crtItm("Репостов", stat.reposts, stat.reposts / stat.users);
        text += crtItm("Просмотры", stat.views);//, stat.views / stat.users);
        const pp = Math.round(stat.views / stat.posts);
        text += crtItm("Просм/пост", pp, pp / stat.users); 
		text += crtItm("Постов/сутки", (stat.posts / stat.period).toFixed(2));
        text += crtItm("ER", calcER(stat).toFixed(2) + "%", undefined ,
        "font-weight:bolder; border-top:1px #939393 solid;");
        
        text += `<button id="force_update" class="flat_button button_wide">Обновить</button>`;

		injectedParentElement.querySelector("#data_block").innerHTML = text;
		injectedParentElement.querySelector("#data_block > #force_update").addEventListener(
			"click",
			() => {
				updateGroupStats(latestGroupID);
			},
			false
		);
	}

	// update stats
	function updateGroupStats(id) {
		if (id <= 0) return;

		var loader_elem = injectedParentElement.querySelector("#loader");
		var data_elem = injectedParentElement.querySelector("#data_block");

		loader_elem.style.display = "block";
		data_elem.style.display = "none";

		var now = new Date();
		const all = Promise.all([
			VKREST.wall.get({ owner_id: -id, count: MAX_POSTS, extended: 1 }),
			VKREST.groups.getMembers({ group_id: id })
		]);

		all.then(r => {
			var data = r[0].response;
			var posts = data.items;
			// if(posts.length < 100) {
			posts = posts.filter(item => {
				var data = new Date(1000 * item.date);
				var deltaDays = Date.daysBetween(data, now);
				if ((IGNORE_PINNED && item.is_pinned) || (IGNORE_ADS && item.marked_as_ads)) return false;
				return deltaDays < MAX_DELTA_DAYS;
			});
			// }

			if (posts.length == 0) {
				return;
			}

			posts = posts.sort((a, b) => {
				return b.date - a.date;
			});

			var stat = {
				lastPost: new Date(1000 * posts[0].date),
				firstPost: new Date(1000 * posts[posts.length - 1].date),
				likes: 0,
				comments: 0,
				reposts: 0,
				views: 0,
				period: 0,
				users: r[1].response.count || 0,
				posts: posts.length
			};
			stat.period = Date.daysBetween(stat.firstPost, stat.lastPost);

			posts.forEach(p => {
				stat.likes += p.likes.count;
				stat.comments += p.comments.count;
				stat.reposts += p.reposts.count;
				stat.views += p.views ? p.views.count : 0; // может отсутствовать
			});

			for (var p in stat) {
				console.log(p + ":" + stat[p]);
			}

			loader_elem.style.display = "none";
			data_elem.style.display = "block";

			updateStatView(stat);
		}).catch(r => {
			updateStatViewError(r);
		});
	}

	function updateStatViewError(res) {
		console.log("VK API ERROR:", res);

		injectedParentElement.querySelector("#loader").style.display = "none";
		const data = injectedParentElement.querySelector("#data_block");
		data.style.display = "block";
		data.innerHTML = `<span style="color: #f15a5a;font-weight: bold;display: block;margin-bottom: 10px;">
            Ошибка ${res.error.error_code}:
        </span>
        <span style="color: #f15a5a;font-weight: 100;display: block;margin-bottom: 10px;">
            ${res.error.error_msg}
        </span>
        <button id="force_update" class="flat_button button_wide">Повторить</button>`;
		data.querySelector("#force_update").addEventListener(
			"click",
			() => {
				updateGroupStats(latestGroupID);
			},
			false
		);
	}

	function injectSidebar() {
		var name = window.location.pathname.replace("/", "");

		if (name === latestGroupName) {
			return;
		}
		if (RESERVED.indexOf(name) > -1) {
			latestGroupID = 0;
			return false;
		}

		var parent = document.querySelector("#narrow_column");
		if (!parent) {
			if (injectedParentElement) {
				injectedParentElement.style.display = "none";
			}
			return false;
		}

		latestGroupName = name;

		//check public without name
		if (name.indexOf("public") > -1) {
			var tst = name.replace("public", "");
			if (!isNaN(parseInt(tst, 10))) {
				name = tst;
			}
		}
		//check club
		if (name.indexOf("club") > -1) {
			tst = name.replace("club", "");
			if (!isNaN(parseInt(tst, 10))) {
				name = tst;
			}
		}

		injectedParentElement = document.querySelector("#injected_element");
		if (!injectedParentElement) {
			injectedParentElement = document.createElement("div");
			injectedParentElement.classList.add("page_block");
			injectedParentElement.id = "injected_element";
			injectedParentElement.innerHTML = INJECTED_TEMPLATE;
			parent.insertBefore(injectedParentElement, parent.children[2]);
		} else {
			console.log("Show latest injected");
		}
		injectedParentElement.style.display = "";

		VKREST.groups
			.getById({ group_id: name })
			.then(r => {
				if (r.response && r.response.length > 0) {
					latestGroupID = r.response[0].id;
					updateGroupStats(latestGroupID);
				} else {
					console.log("Owner: " + name + " is'n group");
					if (injectedParentElement) {
						injectedParentElement.style.display = "none";
					}
				}
			})
			.catch(r => {
				updateStatViewError(r);
			});
	}

	console.log("VK Group Injected");
	window.addEventListener(
		"load",
		() => {
			VKREST.init(Tokens);

			const observer = new MutationObserver(() => {
				injectSidebar();
			});
			observer.observe(document, { subtree: true, attributes: true });

			console.log("hook page reloading");
		},
		false
	);

	chrome.storage.onChanged.addListener(data => {
		if (data.FORMULA) {
			FORMULA = data.FORMULA.newValue;
		}
		if (data.POSTS) {
			MAX_POSTS = data.POSTS.newValue;
		}
		updateGroupStats(latestGroupID);
	});
})();

// --- extensions

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

Date.daysBetween = function(date1, date2) {
	//Get 1 day in milliseconds
	var one_day = 1000 * 60 * 60 * 24;

	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();

	// Calculate the difference in milliseconds
	var difference_ms = date2_ms - date1_ms;

	// Convert back to days and return
	return difference_ms / one_day;
};
