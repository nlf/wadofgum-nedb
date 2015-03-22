var Joi = require('joi');
var NeDB = require('nedb');
var Plugin = require('..');
var Promise = require('bluebird');
var Factory = require('wadofgum');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

lab.test('it requires an nedb database to load', function (done) {

    var Broken = new Factory({
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

    User = new Factory({
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
    user.save().catch(function (err) {

        expect(err).to.exist();
        done();
    });
});

lab.test('it can prevent saving by passing an error in preSave', function (done) {

    var Broken = new Factory({
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

    Broken.prototype.on('preSave', function (broken) {

        return Promise.reject(new Error('failed'));
    });

    var broken = new Broken({ name: 'test' });
    broken.save()
        .catch(function (err) {

            expect(err).to.exist();
            expect(err.message).to.equal('failed');
            expect(broken.id).to.not.exist();
            done();
        });
});

lab.test('it can pass an error from postSave', function (done) {

    var Broken = new Factory({
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

    Broken.prototype.on('postSave', function (broken) {

        return Promise.reject(new Error('failed'));
    });

    var broken = new Broken({ name: 'test' });
    broken.save()
        .catch(function (err) {

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
    user.save()
        .then(function () {

            expect(user.id).to.exist();
            expect(user._type).to.not.exist();
            expect(user._id).to.not.exist();
            userId = user.id;
            done();
        });
});

lab.test('it can find all models', function (done) {

    User.find()
        .then(function (users) {

            expect(users).to.be.an.array();
            expect(users).to.have.length(1);
            done();
        });
});

lab.test('it can find models with a query', function (done) {

    User.find({ name: 'test' })
        .then(function (users) {

            expect(users).to.be.an.array();
            expect(users).to.have.length(1);
            done();
        });
});

lab.test('it can count models', function (done) {

    User.count()
        .then(function (users) {

            expect(users).to.equal(1);
            return User.count({ name: 'banana' });
        })
        .then(function (users) {

            expect(users).to.equal(0);
            done();
        });
});

lab.test('it can fetch a model by id', function (done) {

    User.get(userId)
        .then(function (user) {

            expect(user.id).to.equal(userId);
            done();
        });
});

lab.test('returns a not found error when fetching a model by id that doesnt exist', function (done) {

    User.get('bananas')
        .catch(function (err) {

            expect(err).to.exist();
            expect(err.message).to.equal('not found');
            done();
        });
});

lab.test('can update a document', function (done) {

    User.get(userId).then(function (user) {

        expect(user.id).to.equal(userId);
        user.update({ $set: { name: 'testing' } }).then(function (user) {

            expect(user.name).to.equal('testing');
            user.update({ $set: { _id: 'bananas' } }, {}).catch(function (err) {

                expect(err).to.exist();
                expect(err.message).to.equal('You can\'t change a document\'s _id');
                done();
            });
        });
    });
});

lab.test('can batch update documents', function (done) {

    User.update({ name: 'testing' }, { $set: { name: 'test' } }, {})
        .then(function (num) {

            expect(num).to.equal(1);
            return User.update({ name: 'test' }, { $set: { name: 'testing' } });
        })
        .then(function (num) {

            expect(num).to.equal(1);
            return User.update({ $set: { name: 'test' } });
        })
        .then(function (num) {

            expect(num).to.equal(1);
            done();
        });
});

lab.test('can remove a document', function (done) {

    User.get(userId)
        .then(function (user) {

            expect(user.id).to.equal(userId);
            return user.remove();
        })
        .then(function () {
            return User.get(userId);
        })
        .catch(function (err) {

            expect(err).to.exist();
            expect(err.message).to.equal('not found');
            done();
        });
});
