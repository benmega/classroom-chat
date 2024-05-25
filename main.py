from application import create_app

app = create_app()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
    # app.run(debug=True, host='192.168.1.16', port=5000)