pipeline {
  options {
    buildDiscarder(logRotator(daysToKeepStr: '60'))
  }

  agent {
    label 'vagov-general-purpose'
  }

  stages {
    stage('Checkout Code') {
      steps {
        checkout scm
      }
    }

    stage('Run tests') {
      agent {
        dockerfile {
          args "--entrypoint='' -u 0:0"
          dir "saml-proxy"
          label 'vagov-general-purpose'
        }
      }

      steps {
        withEnv(['CI=true']) {
          sh 'cd saml-proxy && npm install'
          sh 'cd saml-proxy && npm run-script ci'
        }
      }
      post {
        always {
          junit 'saml-proxy/test-report.xml'
        }
      }
    }

    stage('Deploy dev and staging') {
      when { branch 'master' }

      steps {
        script {
          commit = sh(returnStdout: true, script: "git rev-parse HEAD").trim()
        }

        build job: 'builds/vets-saml-proxy', parameters: [
          booleanParam(name: 'notify_slack', value: true),
          stringParam(name: 'ref', value: commit),
          booleanParam(name: 'release', value: false),
        ], wait: true

        build job: 'deploys/vets-saml-proxy-dev', parameters: [
          booleanParam(name: 'notify_slack', value: true),
          stringParam(name: 'ref', value: commit),
        ], wait: false

        build job: 'deploys/vets-saml-proxy-staging', parameters: [
          booleanParam(name: 'notify_slack', value: true),
          stringParam(name: 'ref', value: commit),
        ], wait: false
      }
    }
  }
  post {
    failure {
      script {
        if (env.BRANCH_NAME == 'master') {
          slackSend message: "Failed vets-saml-proxy CI on branch: `${env.BRANCH_NAME}`! ${env.RUN_DISPLAY_URL}".stripMargin(),
            color: 'danger',
            failOnError: true
        }
      }
    }
  }
}
