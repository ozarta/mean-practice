var app = angular.module('flapperNews', ['ui.router','ngMaterial','ngFileUpload']);



app.factory('posts', ['$http','auth',function($http,auth){
    var o = {
    posts:[]
    };

    o.getAll = function() {
        return $http.get('/posts').success(function(data){
            angular.copy(data, o.posts);
        });
    };
    o.create = function(post) {
        return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        }).success(function(data){
            o.posts.push(data);
        });
    };

    o.upvote = function(post) {
        return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        }).success(function(data){
            post.upvotes += 1;
        });
    };

    o.addComment = function(id, comment) {
        return $http.post('/posts/' + id + '/comments', comment, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        });
    };
    o.get = function(id) {
        return $http.get('/posts/' + id).then(function(res){
            return res.data;
        });
    };

    return o;
}]);
app.factory('auth', ['$http', '$window', function($http, $window){
    var auth = {};
    auth.saveToken = function (token){
        $window.localStorage['flapper-news-token'] = token;
    };

    auth.getToken = function (){
        return $window.localStorage['flapper-news-token'];
    };
    auth.isLoggedIn = function(){
        var token = auth.getToken();

        if(token){
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };
    auth.currentUser = function(){
        if(auth.isLoggedIn()){
            var token = auth.getToken();
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.username;
        }
    };
    auth.register = function(user){
        return $http.post('/register', user).success(function(data){
            auth.saveToken(data.token);
        });
    };
    auth.logIn = function(user){
        return $http.post('/login', user).success(function(data){
            auth.saveToken(data.token);
        });
    };
    auth.logOut = function(){
        $window.localStorage.removeItem('flapper-news-token');
    };

    return auth;
}]);
app.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');
});
app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: 'templates/home.html',
                controller: 'MainCtrl',
                resolve: {
                    postPromise: ['posts', function(posts){
                        return posts.getAll();
                    }]
                }

            })
            .state('posts', {
                url: '/posts/{id}',
                templateUrl: 'templates/posts.html',
                controller: 'PostsCtrl as poster',
                resolve: {
                    post: ['$stateParams', 'posts', function($stateParams, posts) {
                        return posts.get($stateParams.id);
                    }]}
            }).state('login', {
                url: '/login',
                templateUrl: 'templates/login.html',
                controller: 'AuthCtrl as usuario',
                onEnter: ['$state', 'auth', function($state, auth){
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            })
            .state('register', {
                url: '/register',
                templateUrl: 'templates/register.html',
                controller: 'AuthCtrl as usuario',
                onEnter: ['$state', 'auth', function($state, auth){
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            });

        $urlRouterProvider.otherwise('home');
    }]);



app.controller('NavCtrl', [
    'auth',
    function( auth){
        var nav = this;
        nav.isLoggedIn = auth.isLoggedIn;
        nav.currentUser = auth.currentUser;
        nav.logOut = auth.logOut;
    }]);
app.controller('AuthCtrl', [
    '$state',
    'auth',
    function( $state, auth){
        var usuario = this;
        usuario.user = {};

        usuario.register = function(){
            auth.register(usuario.user).error(function(error){
                usuario.error = error;
            }).then(function(){
                $state.go('home');
            });
        };

        usuario.logIn = function(){
            auth.logIn(usuario.user).error(function(error){
                usuario.error = error;
            }).then(function(){
                $state.go('home');
            });
        };
    }]);

app.controller('PostsCtrl', [  'posts','post','auth',  function(  posts,post,auth){
        var poster = this;
        poster.post = post;
    poster.isLoggedIn = auth.isLoggedIn;

    poster.addComment = function(){
        if(poster.body === '') { return; }
        posts.addComment(post._id, {
            body: poster.body,
            author: 'user'
        }).success(function(comment) {
            poster.post.comments.push(comment);
        });
        poster.body = '';
    };




    }]);


app.controller('MyCtrl', ['$scope', 'Upload','auth', '$timeout', function ($scope, Upload,auth, $timeout) {
    $scope.uploadPic = function(file) {
        file.upload = Upload.upload({
            url: 'https://angular-file-upload-cors-srv.appspot.com/upload',
            data: {file: file, username: $scope.username},
        });

        file.upload.then(function (response) {
            $timeout(function () {
                file.result = response.data;
            });
        }, function (response) {
            if (response.status > 0)
                $scope.errorMsg = response.status + ': ' + response.data;
        }, function (evt) {
            // Math.min is to fix IE which reports 200% sometimes
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });
    }
}]);

app.controller('MainCtrl',['$scope','Upload','posts','auth','$timeout','$http', function ($scope,Upload,posts,auth,$timeout,$http) {


    $scope.posts = posts.posts;
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.remove = function(post) {
        return $http.delete('/posts/' + post._id,{headers: {Authorization: 'Bearer '+auth.getToken()}})
            .success(function(data) {
                posts.getAll()

            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    $scope.uploadPic = function(file) {
        if(file==undefined)
        {
            posts.create({
                title: $scope.title,
                link: $scope.link
            });
            $scope.title = '';
            $scope.link = '';
        }
        console.log(file);
        console.log($scope.link);
        console.log($scope.title);
        file.upload = Upload.upload({
            url: '/posts',
            data: {title:$scope.title,link:$scope.link},
            file: file,
            headers: {Authorization: 'Bearer '+auth.getToken(),'Content-Type': file.type}

        });

        file.upload.then(function (response) {
            console.log("Postcontroller: upload then ");
            $timeout(function () {
                file.result = response.data;
            });
        }, function (response) {
            if (response.status > 0)
                $scope.errorMsg = response.status + ': ' + response.data;
        });

        file.upload.progress(function (evt) {
            // Math.min is to fix IE which reports 200% sometimes
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            console.log("PostController: upload progress " + file.progress);
        });

        file.upload.success(function (data, status, headers, config) {
            $scope.title = '';
            $scope.link = '';
            $scope.picFile = '';
            console.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
            posts.getAll()
        });


    };

    $scope.incrementUpvotes = function(post) {
        posts.upvote(post)
    };
}]);