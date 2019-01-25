var VKREST = (function() {
	const VK_REST = "https://api.vk.com/method/";
	var TOKEN = "";
	var APP_ID = "";

	function Init(app, token) {
		TOKEN = token;
		APP_ID = app;
	}

	function sendRequest(req) {
		return new Promise((res, rej) => {
			const xhr = new XMLHttpRequest();

			xhr.addEventListener("load", r => {
				res(xhr.response);
			});
			xhr.addEventListener("error", rej);

			const data = `${VK_REST}${req}&access_token=${TOKEN}&v=5.92`;
			xhr.open("GET", data, true);
			xhr.responseType = "json";
			xhr.send();
		});
	}

	function WallGet({ owner_id, count, extended = 0, offset = 0 }) {
		if (!TOKEN || !APP_ID) {
			throw Error("Api cant inited!");
		}
		 return sendRequest(
			`wall.get?owner_id=${owner_id}&count=${count || 100}&extended=${extended}&offset=${offset}`
		);
	}

	function GroupsGetById(id) {
		if (!TOKEN || !APP_ID) {
			throw Error("Api cant inited!");
		}
		return sendRequest(`groups.getById?group_id=${id}`);
	}

	return {
		init: Init,
		wall: {
			get: WallGet
		},
		groups: {
			getById: GroupsGetById
		}
	};
})();
