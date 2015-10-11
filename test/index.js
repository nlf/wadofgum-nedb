'use strict';

const Joi = require('joi');
const NeDB = require('nedb');
const Mixin = require('..');
const Validation = require('wadofgum-validation');
const Wadofgum = require('wadofgum');

let lab = exports.lab = require('lab').script();
let expect = require('code').expect;

lab.test('it can be loaded', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    expect(User).to.exist();
    expect(User.capabilities.has('nedb')).to.equal(true);
    done();
});

lab.test('it can have a db associated', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    expect(User.meta.get('db')).to.contain('insert', 'find', 'count', 'update', 'remove', 'raw');
    done();
});

lab.test('it does nothing when attempting to set a schema without a validation mixin', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.schema = { name: Joi.string() };
    expect(User.meta.has('keys')).to.equal(false);
    done();
});

lab.test('it can save a model', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    user.save().then(() => {

        expect(user).to.contain('name', '_type', '_id');
        expect(user._type).to.equal(user.constructor.name);
        done();
    }).catch(done);
});

lab.test('it rejects when attempting to save when no db is assigned', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    let user = new User({ name: 'test' });
    user.save().catch((err) => {

        expect(err.message).to.equal('No db assigned to model class: User');
        done();
    }).catch(done);
});

lab.test('it can fetch a model given its id', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    user.save().then(() => {

        let user2 = new User({ _id: user._id });
        expect(user2.name).to.not.exist();
        return user2.get().then(() => {

            expect(user2.name).to.equal(user.name);
            done();
        });
    }).catch(done);
});

lab.test('it returns an error when an id is not found', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    user.get().catch((err) => {

        expect(err.message).to.equal('Not found');
        done();
    }).catch(done);
});

lab.test('it can remove a model', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    user.save().then(() => {

        let id = user._id;
        return user.remove().then(() => {

            return User.findOne({ _id: id });
        }).catch((err) => {

            expect(user.name).to.not.exist();
            expect(err.message).to.equal('Not found');
            done();
        });
    }).catch(done);
});

lab.test('it can count models', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    User.count({ name: 'test' }).then((count) => {

        expect(count).to.equal(0);
        let user = new User({ name: 'test' });
        return user.save();
    }).then(() => {

        return User.count({ name: 'test' });
    }).then((count) => {

        expect(count).to.equal(1);
        done();
    }).catch(done);
});

lab.test('it can find models', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.find({ name: 'test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0]).to.deep.equal(user);
        done();
    }).catch(done);
});

lab.test('it can find a single model', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    User.findOne({ name: 'test' }).catch((err) => {

        expect(err.message).to.equal('Not found');
        return user.save();
    }).then(() => {

        return User.findOne({ name: 'test' });
    }).then((model) => {

        expect(model).to.deep.equal(user);
        done();
    }).catch(done);
});

lab.test('it can update models with a full document', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { name: 'not test' });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.test('it can update models with a partial update', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { $set: { name: 'not test' } });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.test('it can update models with options', function (done) {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    let user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { name: 'not test' }, { multi: true });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.describe('when used with validation', function () {

    lab.test('it can extend a given schema', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.schema = Joi.object({ name: Joi.string() });
        expect(User.meta.get('keys')).to.contain('name', '_id', '_type');
        done();
    });

    lab.test('it can extend a given schema by plain object', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.schema = { name: Joi.string() };
        expect(User.meta.get('keys')).to.contain('name', '_id', '_type');
        done();
    });

    lab.test('it validates before saving', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        let user = new User();
        user.save().catch((err) => {

            expect(err.name).to.equal('ValidationError');
            done();
        }).catch(done);
    });

    lab.test('it validates after saving', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        let user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            expect(user).to.not.contain('_type');
            done();
        }).catch(done);
    });

    lab.test('it validates after getting a model instance', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        let user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            expect(user).to.not.contain('_type');
            let user2 = new User({ _id: user._id });
            return user2.get().then(() => {

                expect(user2).to.deep.equal(user);
                done();
            });
        }).catch(done);
    });

    lab.test('it validates after finding models', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        let user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            expect(user).to.not.contain('_type');
            return User.find({ name: 'test' });
        }).then((users) => {

            expect(users.length).to.equal(1);
            expect(users[0]).to.deep.equal(user);
            done();
        }).catch(done);
    });

    lab.test('it validates after finding one model', function (done) {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        let user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            expect(user).to.not.contain('_type');
            return User.findOne({ name: 'test' });
        }).then((innerUser) => {

            expect(innerUser).to.deep.equal(user);
            done();
        }).catch(done);
    });
});

