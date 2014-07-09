'use strict';


angular.module('stormpathIdpApp')
  .service('Stormpath', function Stormpath($window,$routeParams,$location,$rootScope,$q) {
    var params = $location.search();
    var stormpath = $window.Stormpath;

    var client;
    var application;

    this.errors = [];

    this.jwt = params.jwt;


    this.isRegistered = null;
    this.providers = [];

    var self = this;

    self.registeredAccount = null;
    self.verifiedAccount = null;

    function showError(error){
      var msg = error.userMessage || error.developerMessage || error.message || 'Unknown';
      if(self.errors.indexOf(msg)===-1){
        self.errors.push(error.status === 401 ? 'This link has expired' : msg);
      }
      setTimeout(function(){
        throw error;
      },1);
    }

    var ieMatch = $window.navigator.userAgent.match(/MSIE ([0-9.]+)/);
    if(ieMatch && ieMatch[1]){
      if(parseInt(ieMatch[1],10)<10){
        showError(new Error('Internet Explorer ' + ieMatch[1] + ' is not supported.  Please try again with a newer browser.'));
        return;
      }
    }

    var init = $q.defer();

    function initialize(){

      try{
        client = new stormpath.Client(function(err,idSiteModel){
          if(err){
            showError(err);
          }else{
            $rootScope.$apply(function(){
              if(err){
                showError(err);
              }else{
                var m = idSiteModel;
                self.idSiteModel = m;
                self.providers = self.providers.concat(m.providers);
                $rootScope.logoUrl = m.logoUrl;
                init.resolve();
              }
            });
          }
        });

      }catch(e){
        showError(e);
        return;
      }
    }

    this.init = init.promise;

    this.login = function(username,password,cb){

      client.login({
        login: username,
        password: password
      },function(err,response){
        $rootScope.$apply(function(){
          if(err){
            cb(err);
          }else{
            redirect(response.redirectUrl);
          }
        });
      });

    };

    function redirect(url){
      $window.location = url;
    }

    this.register = function(data,cb){

      client.register(data,function(err,response){
        $rootScope.$apply(function(){
          if(err){
            cb(err);
          }else if(response.redirectUrl){
            redirect(response.redirectUrl);
          }else{
            self.isRegistered = true;
            $location.path('/unverified');
          }
        });
      });

    };

    this.verifyEmailToken = function(token,cb){
      if(self.verifiedAccount){
        cb(null,self.verifiedAccount);
        return;
      }
      try{
        var p = self.appHref.split('/');
        var uri = p[0] + '//' + p[2] + '/v1/accounts/emailVerificationTokens/' + token;
        client._dataStore.createResource(uri,function(err,resource,response){
          $rootScope.$apply(function(){
            cb(err,response);
          });
        });
      }
      catch(e){
        showError(e);
      }
    };

    this.verifyPasswordToken = function(token,cb){
      try{
        application.verifyPasswordResetToken(token,function(err, account) {
          $rootScope.$apply(function(){
            cb(err,account);
          });
        });
      }
      catch(e){
        showError(e);
      }
    };

    this.sendPasswordResetEmail = function(email,cb){
      try{
        application.sendPasswordResetEmail(email,function(err, resp) {
          $rootScope.$apply(function(){
            cb(err,resp);
          });
        });
      }
      catch(e){
        showError(e);
      }
    };

    this.saveAccount = function(account,cb){
      try{
        account.save(function(err, account) {
          if(!err){
            self.verifiedAccount = account;
          }
          $rootScope.$apply(function(){
            cb(err,account);
          });
        });
      }
      catch(e){
        showError(e);
      }
    };

    this.getProvider = function(providerId){
      var r = self.providers.filter(function(p){
        return p.providerId === providerId;
      });
      return r.length === 1 ? r[0]:null;
    };

    initialize();

    return this;
  });
