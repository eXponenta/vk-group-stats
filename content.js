//Список Ваших токенов для доступа к API ВК (токен приложения)

("use strict");

const RESERVED = ["im", "groups", "feed", "friends", "video", "docs", "apps", "search", "vkpay"];

let FORMULA = "100 * (likes + 1.5 * reposts + 2 * comments ) / views"; //формула

const storage = chrome.storage.sync;

const IGNORE_PINNED = false; //не считать запиненный
const IGNORE_ADS = true; //не считать рекламные
const SELECT_RANDOM_TOKEN = true; // true - при инициализации (открытии страницы) буде случайный из набора

let MAX_POSTS = 100; // стандартное значение, выставляется в настройках
let MAX_PERIOD = 60; // стандартное значение, выставляется в настройках

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
		if (percent) {
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
		text += crtItm("Лайков", stat.likes, stat.likes / stat.views);
		text += crtItm("Коммeнты", stat.comments, stat.comments / stat.views);
		text += crtItm("Репостов", stat.reposts, stat.reposts / stat.views);
		text += crtItm("Просмотры", stat.views); //, stat.views / stat.users);
		const pp = Math.round(stat.views / stat.posts);
		text += crtItm("Просм/пост", pp, pp / stat.users);
		text += crtItm("Постов/сутки", (stat.posts / stat.period).toFixed(2));
		text += crtItm(
			"ER",
			calcER(stat).toFixed(2) + "%",
			undefined,
			"font-weight:bolder; border-top:1px #939393 solid;"
		);

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

	function getOrUpdatePanel() {
		let parent = document.querySelector("#narrow_column");
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

		return injectedParentElement;
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

			posts = posts.sort((a, b) => {
				return b.date - a.date;
			});

			// if(posts.length < 100) {
			posts = posts.filter(item => {
				var data = new Date(1000 * item.date);
				var deltaDays = Date.daysBetween(data, now);
				if ((IGNORE_PINNED && item.is_pinned) || (IGNORE_ADS && item.marked_as_ads)) {
					return false;
				}
				return deltaDays < MAX_PERIOD;
			});
			// }

			loader_elem.style.display = "none";
			data_elem.style.display = "block";

			var stat = {
				lastPost: new Date(), // new Date(1000 * posts[0].date),
				firstPost: new Date(), // new Date(1000 * posts[posts.length - 1].date),
				likes: 0,
				comments: 0,
				reposts: 0,
				views: 0,
				period: MAX_PERIOD,
				users: r[1].response.count || 0,
				posts: posts.length
			};

			if (posts.length == 0) {
				updateStatView(stat);
				return;
			}

			stat.lastPost = new Date(1000 * posts[0].date);
			stat.firstPost = new Date(1000 * posts[posts.length - 1].date);
	
			for(let iter = posts.length - 1; iter >= 0; iter--) {
				if(!posts[iter].is_pinned) {
					stat.firstPost = new Date(1000 * posts[iter].date);
					break;
				}
			}
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

			updateStatView(stat);
		}).catch(r => {
			updateStatViewError(r);
		});
	}

	function updateStatViewError(res) {
		console.log("VK API ERROR:", res);

		let err = "Произошла ошибка!";
		let mesg = "Смотри консоль.";

		if (res.error && res.error.error_code) {
			if (res.error.error_code == 100) {
				injectedParentElement.style.display = "none";
				return;
			}

			err = `Ошибка ${res.error.error_code}`;
			mesg = res.error.error_msg;
		}

		injectedParentElement.querySelector("#loader").style.display = "none";
		const data = injectedParentElement.querySelector("#data_block");
		data.style.display = "block";
		data.innerHTML = `
		<span style="color: #f15a5a;font-weight: bold;display: block;margin-bottom: 10px;">
			${err}   
        </span>
        <span style="color: #f15a5a;font-weight: 100;display: block;margin-bottom: 10px;">
            ${mesg}
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

		VKREST.groups
			.getById({ group_id: name })
			.then(r => {
				latestGroupID = r.response[0].id;

				getOrUpdatePanel();
				updateGroupStats(latestGroupID);
			})
			.catch(r => {
				console.warn("VK Error:", r);
				//updateStatViewError(r);
			});
	}

	console.log("VK Group Injected");
	window.addEventListener(
		"load",
		() => {
			VKREST.init(SETTINGS.Tokens, { random: SELECT_RANDOM_TOKEN });
			storage.get(["FORMULA", "POSTS", "PERIOD"], it => {
				FORMULA = it.FORMULA || FORMULA;
				MAX_POSTS = it.POSTS || MAX_POSTS;
				MAX_PERIOD = it.PERIOD || MAX_PERIOD;
			});

			const observer = new MutationObserver(() => {
				injectSidebar();
			});
			observer.observe(document, { subtree: true, attributes: true });

			console.log("hook page reloading");
		},
		false
	);

	chrome.storage.onChanged.addListener(it => {
		FORMULA = it.FORMULA ? it.FORMULA.newValue : FORMULA;
		MAX_POSTS = it.POSTS ? it.POSTS.newValue : MAX_POSTS;
		MAX_PERIOD = it.PERIOD ? it.PERIOD.newValue : MAX_PERIOD;

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
