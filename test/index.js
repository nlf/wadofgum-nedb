var Joi = require('joi');
var NeDB = require('nedb');
var Plugin = require('..');
var WOG = require('wadofgum');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

lab.test('it requires an nedb database to load', function (done) {

    var Broken = new WOG({
        name: 'user',
        schema: {
            id: Joi.string(),
            name: Joi.string()
        }
    });

    expect(function () {

        Broken.use(Plugin);
    }).to.throw();

    expect(function () {

        Broken.use(Plugin, {});
    }).to.throw();

    done();
});

var User;
var db = new NeDB();

lab.test('it can be loaded', function (done) {

    User = new WOG({
        name: 'user',
        schema: {
            id: Joi.string(),
            name: Joi.string().required()
        }
    });

    expect(function () {

        User.use(Plugin, { db: db });
    }).to.not.throw();

    done();
});

lab.test('it fails to save when the model fails validation', function (done) {

    var user = new User();
    user.save(function (err) {

        expect(err).to.exist();
        done();
    });
});

var userId;

lab.test('it can save a model', function (done) {

    var user = new User({ name: 'test' });
    expect(user.id).to.not.exist();
    user.save(function (err) {

        expect(err).to.not.exist();
        expect(user.id).to.exist();
        userId = user.id;
        done();
    });
});

lab.test('it can find models', function (done) {

    User.find({ name: 'test' }, function (err, users) {

        expect(err).to.not.exist();
        expect(users).to.be.an.array();
        expect(users).to.have.length(1);
        done();
    });
});

lab.test('it can count models', function (done) {

    User.count(function (err, users) {

        expect(err).to.not.exist();
        expect(users).to.equal(1);

        User.count({ name: 'banana' }, function (err, users) {

            expect(err).to.not.exist();
            expect(users).to.equal(0);
            done();
        });
    });
});

lab.test('it can fetch a model by id', function (done) {

    User.get(userId, function (err, user) {

        expect(err).to.not.exist();
        expect(user.id).to.equal(userId);
        done();
    });
});

lab.test('returns a not found error when fetching a model by id that doesnt exist', function (done) {

    User.get('bananas', function (err, user) {

        expect(err).to.exist();
        expect(err.message).to.equal('not found');
        done();
    });
});

lab.test('can remove a document', function (done) {

    User.get(userId, function (err, user) {

        expect(err).to.not.exist();
        expect(user.id).to.equal(userId);
        user.remove(function (err) {

            expect(err).to.not.exist();
            User.get(userId, function (err) {

                expect(err).to.exist();
                expect(err.message).to.equal('not found');
                done();
            });
        });
    });
});
