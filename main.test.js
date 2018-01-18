
// import
const
	chai = require('chai'),
	expect = chai.expect,
	redis = require('redis'),
	request = require('./main.js'),
	uuid = require('uuid/v1');

// init
chai.should();

/**
 * extract printed time from `whattimeisit.com` body response
 *
 * note: this is used to test url caching
 *
 * @param {String} body
 * @return {String}
 */
function extractTime(body) {
	body = body.replace(/\s/gm, ' ').toLowerCase();
	const re = /^.+?([a-z]+), +(\d{1,2}) +(\d{4})<br> *(\d{2}):(\d{2}):(\d{2}) +[ap]m.+$/;
	if (re.test(body)) {
		const match = body.match(re);
		const hours = parseInt(match[4], 10);
		const minutes = parseInt(match[5], 10);
		const seconds = parseInt(match[6], 10);
		const meridian = parseInt(match[7], 10);
		if (meridian === 'pm') {
			hours += 12;
		}
		return `${hours}:${minutes}:${seconds}`;
	} else {
		throw new Error('Failed to parse page time');
	}
}

describe('main', () => {

	let reTime;
	let redisClient;
	let url;

	before(() => {
		reTime = /^\d{1,2}\:\d{1,2}:\d{1,2}$/;
		redisClient = redis.createClient();
		url = 'http://whattimeisit.com/';
	});

	after(() => {
		process.exit();
	});

	it('should proxy url param', (done) => {
		request(`${url}?randomId=${uuid()}`, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			const time = extractTime(body);
			expect(time).to.match(reTime);
			done();
		});
	});

	it('should proxy option params', (done) => {
		request({
			method: 'GET',
			url: `${url}?randomId=${uuid()}`
		}, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			const time = extractTime(body);
			expect(time).to.match(reTime);
			done();
		});
	});

	it('should store successful results in memory', function(done) {
		this.timeout(3000);
		let time;
		const testUrl = `${url}?randomId=${uuid()}`;
		request({
			method: 'GET',
			url: testUrl,
			cache: 5000
		}, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			time = extractTime(body);
			expect(time).to.match(reTime);
			expect(res.headers['X-Request-Aside-Id']).to.not.be.undefined;
			expect(res.headers['X-Request-Aside-Source']).to.equal('memory');
			setTimeout(() => {
				request({
					method: 'GET',
					url: testUrl,
					cache: 5000
				}, (err, res, body) => {
					expect(err).to.be.null;
					expect(res.statusCode).to.equal(200);
					const time2 = extractTime(body);
					expect(time2).to.match(reTime);
					expect(time).to.equal(time2);
					expect(res.headers['X-Request-Aside-Id']).to.not.be.undefined;
					expect(res.headers['X-Request-Aside-Source']).to.equal('memory');
					done();
				});
			}, 1500);
		});
	});

	it('should expire results stored in memory', function(done) {
		this.timeout(5000);
		let time;
		const testUrl = `${url}?randomId=${uuid()}`;
		request({
			method: 'GET',
			url: testUrl,
			cache: 2000
		}, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			time = extractTime(body);
			expect(time).to.match(reTime);
		});
		setTimeout(() => {
			request({
				method: 'GET',
				url: testUrl,
				cache: 2000
			}, (err, res, body) => {
				expect(err).to.be.null;
				expect(res.statusCode).to.equal(200);
				const time2 = extractTime(body);
				expect(time).to.not.equal(time2);
				done();
			});
		}, 3000);
	});

	it('should store results in redis', (done) => {
		let time;
		const testUrl = `${url}?randomId=${uuid()}`;
		request({
			method: 'GET',
			url: testUrl,
			cache: 5000,
			redis: redisClient
		}, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			time = extractTime(body);
			expect(time).to.match(reTime);
			expect(res.headers['X-Request-Aside-Id']).to.not.be.undefined;
			expect(res.headers['X-Request-Aside-Source']).to.equal('redis');
			request({
				method: 'GET',
				url: testUrl,
				cache: 5000,
				redis: redisClient
			}, (err, res, body) => {
				expect(err).to.be.null;
				expect(res.statusCode).to.equal(200);
				const time2 = extractTime(body);
				expect(time).to.equal(time2);
				expect(res.headers['X-Request-Aside-Id']).to.not.be.undefined;
				expect(res.headers['X-Request-Aside-Source']).to.equal('redis');
				done();
			});
		});
	});

	it('should expire results stored in redis', function(done) {
		this.timeout(5000);
		let time;
		const testUrl = `${url}?randomId=${uuid()}`;
		request({
			method: 'GET',
			url: testUrl,
			cache: 2000,
			redis: redisClient
		}, (err, res, body) => {
			expect(err).to.be.null;
			expect(res.statusCode).to.equal(200);
			time = extractTime(body);
			expect(time).to.match(reTime);
		});
		setTimeout(() => {
			request({
				method: 'GET',
				url: testUrl,
				cache: 2000,
				redis: redisClient
			}, (err, res, body) => {
				expect(err).to.be.null;
				expect(res.statusCode).to.equal(200);
				const time2 = extractTime(body);
				expect(time).to.not.equal(time2);
				done();
			});
		}, 3000);
	});

	it('should support promises', (done) => {
		const testUrl = `${url}?randomId=${uuid()}`;
		request({
			method: 'GET',
			url: testUrl
		}).then((body) => {
			expect(body).to.not.be.undefined;
		}).catch((err) => {
			expect(err).to.be.undefined;
		}).finally(done);
	});

	it('should retrieve cached memory results on repeat requests', function(done) {
		this.timeout(10000);
		const testUrl = `${url}?randomId=${uuid()}`;
		let i = 0;
		const repeat = (i, j) => {
			if (i < j) {
				i++;
				request({
					method: 'GET',
					url: testUrl,
					cache: 10000
				}).then((body) => {
					expect(body).to.not.be.undefined;
					repeat(i, j);
				}).catch((err) => {
					expect(err).to.be.undefined;
					repeat(j, j);
				});
			} else {
				expect(i).to.equal(j);
				done();
			}
		};
		repeat(i, 10);
	});

	it('should retrieve cached redis results on repeat requests', function(done) {
		this.timeout(10000);
		const testUrl = `${url}?randomId=${uuid()}`;
		let i = 0;
		const repeat = (i, j) => {
			if (i < j) {
				i++;
				request({
					method: 'GET',
					url: testUrl,
					cache: 10000,
					redis: redisClient
				}).then((body) => {
					expect(body).to.not.be.undefined;
					repeat(i, j);
				}).catch((err) => {
					expect(err).to.be.undefined;
					repeat(j, j);
				});
			} else {
				expect(i).to.equal(j);
				done();
			}
		};
		repeat(i, 10);
	});

});

