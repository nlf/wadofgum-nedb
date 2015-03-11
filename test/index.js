var Joi = require('joi');
var NeDB = require('nedb');
var Plugin = require('..');
var WOG = require('wadofgum');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

lab.test('it requires an nedb database to load', function (done) {

    var Broken = new WOG({
        type: 'user',
        schema: {
            id: Joi.string(),
            name: Joi.string()
        }
    });

    expect(function () {

        Broken.register(Plugin);
    }).to.throw();

    expect(function () {

        Broken.register({
            register: Plugin,
            options: {}
        });
    }).to.throw();

    done();
});

var User;
var db = new NeDB();

lab.test('it can be loaded', function (done) {

    User = new WOG({
        type: 'user',
        schema: {
            id: Joi.string(),
            name: Joi.string().required()
        }
    });

    expect(function () {

        User.register({
            register: Plugin,
            options: { db: db }
        });
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

lab.test('it can prevent saving by passing an error in preSave', function (done) {

    var Broken = new WOG({
        type: 'broken',
        schema: {
            id: Joi.string(),
            name: Joi.string().required()
        }
    });

    Broken.register({
        register: Plugin,
        options: {
            db: db
        }
    });

    Broken.prototype.on('preSave', function (broken, next) {

        next(new Error('failed'));
    });

    var broken = new Broken({ name: 'test' });
    broken.save(function (err) {

        expect(err).to.exist();
        expect(err.message).to.equal('failed');
        expect(broken.id).to.not.exist();
        done();
    });
});

lab.test('it can pass an error from postSave', function (done) {

    var Broken = new WOG({
        type: 'broken',
        schema: {
            id: Joi.string(),
            name: Joi.string().required()
        }
    });

    Broken.register({
        register: Plugin,
        options: {
            db: db
        }
    });

    Broken.prototype.on('postSave', function (broken, next) {

        next(new Error('failed'));
    });

    var broken = new Broken({ name: 'test' });
    broken.save(function (err) {

        expect(err).to.exist();
        expect(err.message).to.equal('failed');
        expect(broken.id).to.exist();
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
        expect(user._type).to.not.exist();
        expect(user._id).to.not.exist();
        userId = user.id;
        done();
    });
});

lab.test('it can find all models', function (done) {

    User.find(function (err, users) {

        expect(err).to.not.exist();
        expect(users).to.be.an.array();
        expect(users).to.have.length(1);
        done();
    });
});

lab.test('it can find models with a query', function (done) {

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

lab.test('can update a document', function (done) {

    User.get(userId, function (err, user) {

        expect(err).to.not.exist();
        expect(user.id).to.equal(userId);
        user.update({ $set: { name: 'testing' } }, function (err, updated) {

            expect(err).to.not.exist();
            expect(updated.name).to.equal('testing');

            updated.update({ $set: { _id: 'bananas' } }, {}, function (err, updated) {

                expect(err).to.exist();
                expect(err).to.equal('You can\'t change a document\'s _id');
                done();
            });
        });
    });
});

lab.test('can batch update documents', function (done) {

    User.update({ name: 'testing' }, { $set: { name: 'test' } }, function (err, num) {

        expect(err).to.not.exist();
        expect(num).to.equal(1);
        User.update({ name: 'test' }, { $set: { name: 'testing' } }, {}, function (err, num) {

            expect(err).to.not.exist();
            expect(num).to.equal(1);
            done();
        });
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
