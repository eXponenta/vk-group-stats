//Список Ваших токенов для доступа к API ВК (токен приложения)
// переехал в settings.js -> Tokens

("use strict");

const RESERVED = ["im", "groups", "feed", "friends", "video", "docs", "apps", "search", "vkpay", "wall"];

const SELECT_RANDOM_TOKEN = true; // true - при инициализации (открытии страницы) буде случайный из набора

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
	let pageObserver;
	let isInited = false;

	function CalcER({ likes, reposts, comments, views, period }) {

		let cond = SETTINGS.params.FORMULA.replace(/likes/g, likes);
		cond = cond.replace(/reposts/g, reposts);
		cond = cond.replace(/comments/g, comments);
		cond = cond.replace(/views/g, views);
		cond = cond.replace(/days/g, period);
		return eval(cond);
	}

	function CrtItm(name, value, percent, style, className = "") {

		let text = value != undefined ? value.toLocaleString() : "";
		if (percent) {
			text += ` (${(100.0 * percent).toFixed(2).toLocaleString()}%)`;
		}

		return `
			<div class="page_actions_item ${className}" style = "${style || ""}">
				<span id="label" class="header_label" style="display:inline-block;">${name ? name + ":" : ""}</span>
				<span id="value" class="header_count fl_r" style="display:inline-block;">${text}</span>
            </div>`;
	}

	function UpdateStatView(stat) {
		let text = "";
		text += CrtItm("Расчет от", stat.period_from.toLocaleDateString() );
		text += CrtItm("       до", stat.period_to.toLocaleDateString() );
		text += CrtItm("Активных дней", Math.round(stat.period) + " д.");
		text += CrtItm("Постов за период", stat.posts);
		text += CrtItm("Лайков", stat.likes, stat.likes / stat.views);
		text += CrtItm("Коммeнты", stat.comments, stat.comments / stat.views);
		text += CrtItm("Репостов", stat.reposts, stat.reposts / stat.views);
		text += CrtItm("Просмотры", stat.views); //, stat.views / stat.users);
	
		const pp = Math.round(stat.views / stat.posts);
	
		text += CrtItm("Просм/пост", pp, pp / stat.users);
		text += CrtItm("Постов/сутки", (stat.posts / stat.period).toFixed(2));

		text += `
			<div style = 'display: flex; justify-content: space-around; border-top:1px #939393 solid;padding: 8px 0;'>
				<button style='margin:2px' data-target="er" class="flat_button button_wide __wig__select black">ОХВАТ</button>
				<button style='margin:2px' data-target="like" class="flat_button button_wide __wig__select">ЛАЙКИ</button>
				<button style='margin:2px' data-target="comm" class="flat_button button_wide __wig__select">КОММЕНТАРИИ</button>
			</div>`;
		

		// for ER
		for(let post of stat.collest.er) {
			const title = `${post.text.substring(0, 16) || post.id} (${post.er.toFixed(2)}%)`;
			const body = `<a href="/wall${post.from_id}_${post.id}">${title}</a>`;

			text += CrtItm("", body, undefined, "display:", "__item __item_type_er");
		}
		
		// likes
		for(let post of stat.collest.like) {
			const title = `${post.text.substring(0, 16) || post.id} (${post.like_per_view.toFixed(2)}%)`;
			const body = `<a href="/wall${post.from_id}_${post.id}">${title}</a>`;

			text += CrtItm("", body, undefined, "display:none;", "__item __item_type_like");
		}
		
		// comments
		for(let post of stat.collest.comm) {
			const title = `${post.text.substring(0, 16) || post.id} (${post.comm_per_view.toFixed(2)}%)`;
			const body = `<a href="/wall${post.from_id}_${post.id}">${title}</a>`;

			text += CrtItm("", body, undefined, "display:none;", "__item __item_type_comm");
		}
		
		text += CrtItm(
			"ER",
			CalcER(stat).toFixed(2) + "%",
			undefined,
			"font-weight:bolder; border-top:1px #939393 solid;"
		);

		text += `<button id="force_update" class="flat_button button_wide">Обновить</button>`;

		injectedParentElement.querySelector("#data_block").innerHTML = text;

		// button
		injectedParentElement.querySelector("#force_update").addEventListener(
			"click",
			() => {
				UpdateGroupStats(latestGroupID);
			},
			false
		);

		//selectors

		let _latest = injectedParentElement.querySelector(".__wig__select.black");

		injectedParentElement.querySelectorAll(".__wig__select").forEach((e)=>{
			e.addEventListener("click", ()=>{
				const target_data = e.dataset.target;

				_latest.classList.toggle("black", false);
				e.classList.toggle("black", true);

				injectedParentElement.querySelectorAll(".__item").forEach((item)=>{
					item.style.display = item.classList.contains ("__item_type_" + target_data) ? "" : "none";
				});

				_latest = e;
			})
		})
	}

	function GetOrUpdatePanel() {

		let parent = document.querySelector("#narrow_column");
		if (!parent) {
			return (injectedParentElement = null);
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
		return injectedParentElement;
	}

	// update stats
	function UpdateGroupStats(id, force = false) {
		if (id <= 0) return;

		var loader_elem = injectedParentElement.querySelector("#loader");
		var data_elem = injectedParentElement.querySelector("#data_block");

		loader_elem.style.display = "block";
		data_elem.style.display = "none";

		
		const from_date_v = new Date(SETTINGS.params.FROM);
		const to_date_v = new Date(SETTINGS.params.TO);

		console.log("Grab between", from_date_v, to_date_v);
		
		const all = Promise.all([
			VKREST.wall.get({ owner_id: -id, count: SETTINGS.params.POSTS, extended: 1 }),
			VKREST.groups.getMembers({ group_id: id })
		]);

		all.then(r => {
			var data = r[0].response;
			var posts = data.items;

			posts = posts.sort((a, b) => {
				return b.date - a.date;
			});

			posts = posts.filter(item => {
				var data = new Date(1000 * item.date);

				if (
					(SETTINGS.params.IGNORE_PINNED && item.is_pinned) ||
					(SETTINGS.params.IGNORE_ADS && item.marked_as_ads)
				) {
					return false;
				}

				return from_date_v <= data && to_date_v > data;
			});

			loader_elem.style.display = "none";
			data_elem.style.display = "block";

			var stat = {
				lastPost: new Date(), // new Date(1000 * posts[0].date),
				firstPost: new Date(), // new Date(1000 * posts[posts.length - 1].date),
				likes: 0,
				comments: 0,
				reposts: 0,
				views: 0,
				period: from_date_v.daysTo(to_date_v) || 1,
				period_from : from_date_v,
				period_to: to_date_v,
				users: r[1].response.count || 0,
				posts: posts.length,
				collest: {
					er:[],
					like:[],
					comm:[]
				}
			};

			if (posts.length == 0) {
				UpdateStatView(stat);
				return;
			}

			stat.lastPost = new Date(1000 * posts[0].date);
			stat.firstPost = new Date(1000 * posts[posts.length - 1].date);

			for (let iter = posts.length - 1; iter >= 0; iter--) {
				if (!posts[iter].is_pinned) {
					stat.firstPost = new Date(1000 * posts[iter].date);
					break;
				}
			}
			stat.period = stat.firstPost.daysTo(stat.lastPost) || 1;

			posts.forEach(p => {
				const likes = p.likes.count;
				const comments = p.comments.count;
				const reposts = p.reposts.count;
				const views = p.views ? p.views.count : 0;

				stat.likes += likes;
				stat.comments += comments;
				stat.reposts += reposts;
				stat.views += views; // может отсутствовать

				p.like_per_view = 100* (views ?  likes / views : 0);
				p.comm_per_view = 100* (views ? comments / views : 0);

				p.er = CalcER({
					likes : likes,
					reposts : reposts,
					comments : comments,
					views : p.views ? p.views.count : 0,
					period: stat.period
				});
			});

			posts.sort((a, b) => b.er - a.er);
			stat.collest.er = posts.slice(0, 3);

			
			posts.sort((a, b) => b.like_per_view - a.like_per_view);
			stat.collest.like = posts.slice(0, 3);

			posts.sort((a, b) => b.comm_per_view - a.comm_per_view);
			stat.collest.comm = posts.slice(0, 3);

			for (var p in stat) {
				console.log(p + ":", stat[p]);
			}

			UpdateStatView(stat);
		}).catch(r => {
			UpdateStatViewError(r);
		});
	}

	function UpdateStatViewError(res) {
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
				UpdateGroupStats(latestGroupID);
			},
			false
		);
	}

	function InjectSidebar() {
		var name = window.location.pathname.replace("/", "");
		
		if (RESERVED.indexOf(name) > -1 || name.includes("wall")) {
			latestGroupID = 0;
			latestGroupName = undefined;
			return false;
		}

		if (name === latestGroupName && document.querySelector("#injected_element")) {
			return false;
		}

		// drop if latest group request failed
		if(name === latestGroupName && latestGroupID ===0) {
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

				GetOrUpdatePanel();
				UpdateGroupStats(latestGroupID);
			})
			.catch(r => {
				console.warn("VK Error:", r);
				
				latestGroupID = 0;

				//updateStatViewError(r);
			});
	}

	function Init() {

		VKREST.Init(SETTINGS.Tokens, { random: SELECT_RANDOM_TOKEN });
		
		let debTimer = 0;

		pageObserver = new MutationObserver(() => {
			
			clearTimeout(debTimer);
			debTimer = setTimeout(()=>{
				InjectSidebar();
			}, 100)
		});
		
		pageObserver.observe(document, { subtree: true, attributes: true });
		
		InjectSidebar();
		isInited = true;
		console.log("VK STATS Init");
	}

	function Destroy() {

		isInited = false;
		latestGroupID = 0;
		latestGroupName = "";
		
		if (pageObserver) {
			pageObserver.disconnect();
		}

		if (injectedParentElement && injectedParentElement.parentElement) {
			injectedParentElement.parentElement.removeChild(injectedParentElement);
			injectedParentElement = undefined;
		}
		console.log("VK STAT Disabled");
	}

	window.addEventListener(
		"load",
		() => {
			SETTINGS.onChanged = e => {
				if (e.ENABLED && !isInited) {
					Init();
					return;
				} else if (isInited) {
					Destroy();
					if(e.ENABLED) {
						Init();
					}
					return;
				}

				UpdateGroupStats(latestGroupID);
			};
			SETTINGS.Init();

			console.log("hook page reloading");
		},
		false
	);
})();

// --- extensions

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

Date.prototype.daysTo = function (date) {
	return Math.floor(Math.abs(this - date) / (1000 * 60 * 60 * 24)); 
}

Date.daysBetween = function(date1, date2) {
	//Get 1 day in milliseconds
	var one_day = 1000 * 60 * 60 * 24;

	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();

	// Calculate the difference in milliseconds
	var difference_ms = Math.abs(date2_ms - date1_ms);

	// Convert back to days and return
	return  Math.floor(difference_ms / one_day);
};
