var VKREST = (function() {
	const VK_REST = "https://api.vk.com/method/";
    let TOKENS = [];
    let currentToken = 0;
    let startToken = 0;

    function getCurrentToken() {
        return TOKENS[currentToken % TOKENS.length];
    }

    function getNextToken() {
        currentToken ++;
        return getCurrentToken();
    }

	function Init(tokens) {
		TOKENS = tokens;
    }
    
    function createXHR(req, res, rej) {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener("load", r => {
            if(!xhr.response.error)
                res(xhr.response);
            else{
                rej(xhr.response);
            }
        });
        xhr.addEventListener("error", rej);

        const data = `${VK_REST}${req}&access_token=${getCurrentToken()}&v=5.92`;
        xhr.open("GET", data, true);
        xhr.responseType = "json";
        xhr.send();
    }

    function trySend(req, res, rej) {
        createXHR(req, res, (r) =>{
            const delta = currentToken - startToken;
            if(r.error.error_code == 29 && delta < TOKENS.length) {
                console.log("TOKEN INVALID:", getCurrentToken());
                
                getNextToken();
                console.log("Try next:", getCurrentToken());
                trySend(req, res, rej);
            } else {
                rej(r);
            }
        });
    }

	function sendRequest(req) {
        
        if (!TOKENS || TOKENS.length == 0) {
			throw Error("Api can't inited!");
        }
        
        startToken = currentToken;
        return new Promise((res, rej) =>{
            trySend(req, res, rej)
		});
	}

	function WallGet({ owner_id, count, extended = 0, offset = 0 }) {
		 return sendRequest(
			`wall.get?owner_id=${owner_id}&count=${count || 100}&extended=${extended}&offset=${offset}`
		);
	}

	function GroupsGetById(id) {
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
